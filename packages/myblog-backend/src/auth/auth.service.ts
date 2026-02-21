import jwt from 'jsonwebtoken';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import type { CookieOptions, Response } from 'express';
import { UserRepository } from '../user/user.repository';
import { UserService } from '../user/user.service';
import { hashData, compareHashedData } from '../common/utils/bcrypt';
import { generateVerificationCode, generateVerificationCodeExpiry, isVerificationCodeExpired } from '../common/utils/verification.utils';
import {
  WrongCredentialsException,
  PasswordResetRequiredException,
  WrongAuthenticationTokenException,
  UserNotActiveException,
} from './auth.errors';
import type { User } from '../database/types';
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

/**
 * Service layer for authentication operations
 * Handles business logic for authentication, password management, and 2FA
 */
export class AuthService {
  private readonly logger = new AppLogger(AuthService.name);
  private userRepository = new UserRepository();
  private userService = new UserService();

  /**
     * Authenticates a user with password validation and status checks
     */
  private authenticateUser(user: UserWithPasswordHash, password: string): User {
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

    const { password_hash: _, passwordHash: __, ...result } = user as UserWithPasswordHash & { password_hash: string };
    return result as unknown as User;
  }

  /**
     * Create a JWT token for a user
     */
  private createToken(user: User, isSecondFactorAuthenticated = false): TokenData {
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

  /**
     * Set authentication cookie on response
     */
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

  /**
     * Generate 2FA secret code
     */
  private getTwoFactorAuthenticationCode() {
    const secretCode = speakeasy.generateSecret({
      name: process.env.TWO_FACTOR_AUTHENTICATION_APP_NAME,
    });
    return {
      otpauthUrl: secretCode.otpauth_url,
      base32: secretCode.base32,
    };
  }

  /**
     * Respond with QR code for 2FA setup
     */
  private async respondWithQRCode(data: string, response: Response): Promise<void> {
    response.setHeader('Content-Type', 'image/png');
    const buffer = await QRCode.toBuffer(data, {
      type: 'png',
      errorCorrectionLevel: 'H',
    });
    response.send(buffer);
  }

  /**
     * Verify 2FA code
     */
  private verifyTwoFactorAuthenticationCode(twoFactorAuthenticationCode: string, user: User) {
    if (!user.twoFactorAuthenticationCode) {
      throw new Error('Two-factor authentication code not set for user');
    }
    return speakeasy.totp.verify({
      secret: user.twoFactorAuthenticationCode,
      encoding: 'base32',
      token: twoFactorAuthenticationCode,
    });
  }

  /**
     * Register a new user
     */
  async register(userData: {
        name: string;
        email: string;
        password: string;
        address?: {
            street: string;
            city: string;
            country: string;
        };
    }, res: Response) {
    const user = await this.userService.register(userData);

    const tokenData = this.createToken(user);
    this.setCookie(res, tokenData);

    this.logger.info('User registered', { userId: user.id });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username || undefined,
      address: user.address,
      profilePicture: user.profilePicture,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      isTwoFactorEnabled: user.isTwoFactorAuthenticationEnabled,
      token: tokenData.token,
    };
  }

  /**
     * Login a user
     */
  async login(email: string, password: string, res: Response) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new WrongCredentialsException();
    }

    if (!user.password_hash) {
      this.logger.warn('User missing password hash, requiring reset', { userId: user.id });
      await this.userRepository.updateStatus(user.id, 'password_reset_required');
      throw new PasswordResetRequiredException();
    }

    const authenticatedUser = this.authenticateUser(user, password);

    const tokenData = this.createToken(authenticatedUser);
    this.setCookie(res, tokenData);

    this.logger.info('User logged in', { userId: authenticatedUser.id });

    const userResponse = {
      id: authenticatedUser.id,
      name: authenticatedUser.name,
      email: authenticatedUser.email,
      username: authenticatedUser.username || undefined,
      profilePicture: authenticatedUser.profilePicture,
      status: authenticatedUser.status,
      createdAt: authenticatedUser.createdAt.toISOString(),
      isTwoFactorEnabled: authenticatedUser.isTwoFactorAuthenticationEnabled,
    };

    if (authenticatedUser.isTwoFactorAuthenticationEnabled) {
      return { ...userResponse, isTwoFactorAuthenticationEnabled: true };
    }

    return { ...userResponse, token: tokenData.token };
  }

  /**
     * Change user password
     */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const userWithPassword = await this.userRepository.findById(userId);

    if (!userWithPassword) {
      throw new WrongCredentialsException();
    }

    // Verify current password
    this.authenticateUser(userWithPassword, currentPassword);

    // Hash new password
    const hashedNewPassword = hashData(newPassword);

    await this.userRepository.updatePassword(userId, hashedNewPassword);
    this.logger.info('Password changed', { userId });
  }

  /**
     * Request password reset
     */
  async requestPasswordReset(email: string) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return { message: 'If an account with this email exists, a password reset link has been sent.' };
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationCodeExpiresAt = generateVerificationCodeExpiry();

    await this.userRepository.updateVerificationCode(
      user.id,
      verificationCode,
      verificationCodeExpiresAt.toISOString(),
    );

    this.logger.info('Password reset requested', { userId: user.id });

    return { message: 'If an account with this email exists, a password reset link has been sent.' };
  }

  /**
     * Confirm password reset
     */
  async confirmPasswordReset(userId: string, verificationCode: string, newPassword: string) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new WrongCredentialsException();
    }

    // Check verification code
    if (user.verificationCode !== verificationCode ||
            isVerificationCodeExpired(user.verificationCodeExpiresAt)) {
      throw new WrongCredentialsException();
    }

    // Hash new password
    const hashedPassword = hashData(newPassword);

    await this.userRepository.updatePassword(userId, hashedPassword);
    await this.userRepository.updateStatus(userId, 'active');
    await this.userRepository.clearVerificationCode(userId);
    this.logger.info('Password reset confirmed', { userId });
  }

  /**
     * Generate 2FA QR code
     */
  async generateTwoFactor(userId: string, res: Response): Promise<void> {
    const { otpauthUrl, base32 } = this.getTwoFactorAuthenticationCode();
    await this.userService.updateTwoFactorCode(userId, base32);
    await this.respondWithQRCode(otpauthUrl || '', res);
    this.logger.info('2FA QR code generated', { userId });
  }

  /**
     * Enable 2FA
     */
  async enableTwoFactor(userId: string, code: string, user: User) {
    const isCodeValid = this.verifyTwoFactorAuthenticationCode(code, user);
    if (!isCodeValid) {
      throw new WrongAuthenticationTokenException();
    }
    await this.userService.enableTwoFactor(userId);
    this.logger.info('2FA enabled', { userId });
  }

  /**
     * Disable 2FA
     */
  async disableTwoFactor(userId: string) {
    await this.userService.disableTwoFactor(userId);
    this.logger.info('2FA disabled', { userId });
  }

  /**
     * Authenticate with 2FA code
     */
  async authenticateTwoFactor(user: User, code: string, res: Response) {
    const isCodeValid = this.verifyTwoFactorAuthenticationCode(code, user);
    if (!isCodeValid) {
      throw new WrongAuthenticationTokenException();
    }

    const tokenData = this.createToken(user, true);
    this.setCookie(res, tokenData);

    this.logger.info('2FA authenticated', { userId: user.id });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      address: user.address,
      profilePicture: user.profilePicture,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      isTwoFactorEnabled: user.isTwoFactorAuthenticationEnabled,
      token: tokenData.token,
    };
  }
}
