import jwt from 'jsonwebtoken';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import type { CookieOptions, Response } from 'express';
import { UserRepository } from '../user/user.repository';
import { UserService } from '../user/user.service';
import { hashData, compareHashedData } from '../common/utils/bcrypt';
import {
  generateVerificationCode,
  generateVerificationCodeExpiry,
  isVerificationCodeExpired,
} from '../common/utils/verification.utils';
import {
  WrongCredentialsException,
  PasswordResetRequiredException,
  WrongAuthenticationTokenException,
  UserNotActiveException,
} from './auth.errors';
import type { User } from '@myblog/shared';
import type { UserWithPasswordHash } from '../user/user.types';
import { AppLogger } from '../common/utils/app-logger/app-logger';

export interface TokenData {
  token: string;
  expiresIn: number;
}

export interface DataStoredInToken {
  _id: string;
  isSecondFactorAuthenticated: boolean;
}

export class AuthService {
  private readonly logger = new AppLogger(AuthService.name);
  private userRepository = new UserRepository();
  private userService = new UserService();

  /** Verifies password against hash, then strips hash. Callers only ever receive User. */
  private authenticateUser(
    user: UserWithPasswordHash,
    password: string
  ): User {
    if (user.status === 'password_reset_required') {
      throw new PasswordResetRequiredException();
    }
    if (user.status !== 'active') {
      throw new UserNotActiveException();
    }

    const doesPasswordMatch = compareHashedData(password, user.password_hash);
    if (!doesPasswordMatch) {
      this.logger.warn('Password mismatch', { userId: user.id });
      throw new WrongCredentialsException();
    }

    const { password_hash: _, ...rest } = user;
    return rest as User;
  }

  private createToken(
    user: { id: string },
    isSecondFactorAuthenticated = false
  ): TokenData {
    const expiresIn = 60 * 60; // an hour
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
    const dataStoredInToken: DataStoredInToken = {
      isSecondFactorAuthenticated,
      _id: user.id,
    };
    return {
      expiresIn,
      token: jwt.sign(dataStoredInToken, secret, { expiresIn }),
    };
  }

  private setCookie(response: Response, tokenData: TokenData) {
    const cookieOptions: CookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: tokenData.expiresIn * 1000, // Convert to milliseconds
      path: '/',
    };

    // Only set secure in production (HTTPS)
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.secure = true;
    }

    // Don't set domain for localhost - let browser handle it
    // Setting domain can cause issues with localhost

    response.cookie('Authorization', tokenData.token, cookieOptions);
  }

  private getTwoFactorAuthenticationCode() {
    const secretCode = speakeasy.generateSecret({
      name: process.env.TWO_FACTOR_AUTHENTICATION_APP_NAME,
    });
    return {
      otpauthUrl: secretCode.otpauth_url,
      base32: secretCode.base32,
    };
  }

  private async respondWithQRCode(
    data: string,
    response: Response
  ): Promise<void> {
    response.setHeader('Content-Type', 'image/png');
    const buffer = await QRCode.toBuffer(data, {
      type: 'png',
      errorCorrectionLevel: 'H',
    });
    response.send(buffer);
  }

  private verifyTwoFactorAuthenticationCode(
    twoFactorAuthenticationCode: string,
    user: { twoFactorAuthenticationCode: string | null }
  ) {
    if (!user.twoFactorAuthenticationCode) {
      throw new Error('Two-factor authentication code not set for user');
    }
    return speakeasy.totp.verify({
      secret: user.twoFactorAuthenticationCode,
      encoding: 'base32',
      token: twoFactorAuthenticationCode,
    });
  }

  async register(params: {
    userData: {
      name: string;
      email: string;
      password: string;
    };
    res: Response;
  }) {
    const user = await this.userService.create(params.userData);

    const tokenData = this.createToken(user);
    this.setCookie(params.res, tokenData);
    this.logger.info('User registered', { userId: user.id });

    return { ...user, token: tokenData.token };
  }

  async login(params: { email: string; password: string; res: Response }) {
    const user = await this.userRepository.findByEmailWithPasswordHash(
      params.email
    );

    if (!user) {
      throw new WrongCredentialsException();
    }

    if (!user.password_hash) {
      this.logger.warn('User missing password hash, requiring reset', {
        userId: user.id,
      });
      await this.userRepository.updateStatus({
        id: user.id,
        status: 'password_reset_required',
      });
      throw new PasswordResetRequiredException();
    }

    const authenticatedUser = this.authenticateUser(user, params.password);
    const tokenData = this.createToken(authenticatedUser);
    this.setCookie(params.res, tokenData);

    this.logger.info('User logged in', { userId: authenticatedUser.id });

    if (authenticatedUser.isTwoFactorAuthenticationEnabled) {
      return {
        ...authenticatedUser,
        isTwoFactorAuthenticationEnabled: true,
      };
    }

    return { ...authenticatedUser, token: tokenData.token };
  }

  async changePassword(params: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }) {
    const userWithPassword =
      await this.userRepository.findByIdWithPasswordHash(params.userId);

    if (!userWithPassword) {
      throw new WrongCredentialsException();
    }

    this.authenticateUser(userWithPassword, params.currentPassword);
    const hashedNewPassword = hashData(params.newPassword);

    await this.userRepository.updatePassword({
      id: params.userId,
      passwordHash: hashedNewPassword,
    });
    this.logger.info('Password changed', { userId: params.userId });
  }

  async requestPasswordReset(email: string) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return {
        message:
          'If an account with this email exists, a password reset link has been sent.',
      };
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationCodeExpiresAt = generateVerificationCodeExpiry();

    await this.userRepository.updateVerificationCode({
      id: user.id,
      code: verificationCode,
      expiresAt: verificationCodeExpiresAt.toISOString(),
    });

    this.logger.info('Password reset requested', { userId: user.id });

    return {
      message:
        'If an account with this email exists, a password reset link has been sent.',
    };
  }

  async confirmPasswordReset(params: {
    userId: string;
    verificationCode: string;
    newPassword: string;
  }) {
    const user = await this.userRepository.findById(params.userId);

    if (!user) {
      throw new WrongCredentialsException();
    }

    if (
      user.verificationCode !== params.verificationCode ||
      isVerificationCodeExpired(user.verificationCodeExpiresAt)
    ) {
      throw new WrongCredentialsException();
    }

    const hashedPassword = hashData(params.newPassword);

    await this.userRepository.updatePassword({
      id: params.userId,
      passwordHash: hashedPassword,
    });
    await this.userRepository.updateStatus({
      id: params.userId,
      status: 'active',
    });
    await this.userRepository.clearVerificationCode(params.userId);
    this.logger.info('Password reset confirmed', { userId: params.userId });
  }

  async generateTwoFactor(userId: string, res: Response): Promise<void> {
    const { otpauthUrl, base32 } = this.getTwoFactorAuthenticationCode();
    await this.userService.updateTwoFactorCode({ userId, code: base32 });
    await this.respondWithQRCode(otpauthUrl || '', res);
    this.logger.info('2FA QR code generated', { userId });
  }

  async enableTwoFactor(params: {
    userId: string;
    code: string;
    user: { twoFactorAuthenticationCode: string | null };
  }) {
    const isCodeValid = this.verifyTwoFactorAuthenticationCode(
      params.code,
      params.user
    );
    if (!isCodeValid) {
      throw new WrongAuthenticationTokenException();
    }
    await this.userService.enableTwoFactor(params.userId);
    this.logger.info('2FA enabled', { userId: params.userId });
  }

  async disableTwoFactor(userId: string) {
    await this.userService.disableTwoFactor(userId);
    this.logger.info('2FA disabled', { userId });
  }

  async authenticateTwoFactor(params: {
    user: User;
    code: string;
    res: Response;
  }) {
    const isCodeValid = this.verifyTwoFactorAuthenticationCode(
      params.code,
      params.user
    );
    if (!isCodeValid) {
      throw new WrongAuthenticationTokenException();
    }

    const tokenData = this.createToken(params.user, true);
    this.setCookie(params.res, tokenData);

    this.logger.info('2FA authenticated', { userId: params.user.id });

    return { ...params.user, token: tokenData.token };
  }
}
