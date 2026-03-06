import { Controller, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@myblog/shared';
import { getTokenFromHeaders } from './auth.helper.js';
import { CurrentUser } from './current-user.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { RequestUser } from './auth.types.js';
import { AppLogger } from '../common/utils/app-logger/app-logger.js';
import { serializeError } from '../common/utils/serializeError.js';
import {
  AuthenticationTokenMissingException,
  PasswordResetRequiredException,
  UserNotActiveException,
  WrongAuthenticationTokenException,
  WrongCredentialsException,
} from './auth.errors.js';
import { AuthService } from './auth.service.js';
import { UserService } from '../users/user.service.js';

@Controller()
export class AuthController {
  private readonly logger = new AppLogger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) {}

  @TsRestHandler(contract.auth.register)
  register() {
    return tsRestHandler(contract.auth.register, async ({ body }) => {
      try {
        const tokenResponse = await this.authService.register({
          userData: {
            name: body.name,
            email: body.email,
            password: body.password,
          },
        });
        return {
          status: 200 as const,
          body: { accessToken: tokenResponse.accessToken },
        };
      } catch (error) {
        if (error instanceof WrongCredentialsException) {
          this.logger.warn('Registration failed: wrong credentials', {
            email: body.email,
          });
          return { status: 400 as const, body: { error: error.message } };
        }
        this.logger.error(
          { message: 'Error registering user', error },
          { email: body.email }
        );
        return { status: 500 as const, body: { error: serializeError(error) } };
      }
    });
  }

  @TsRestHandler(contract.auth.login)
  login() {
    return tsRestHandler(contract.auth.login, async ({ body }) => {
      try {
        const loginResponse = await this.authService.login({
          email: body.email,
          password: body.password,
        });
        return { status: 200 as const, body: loginResponse };
      } catch (error) {
        if (error instanceof WrongCredentialsException) {
          this.logger.warn('Login failed: wrong credentials', { email: body.email });
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof AuthenticationTokenMissingException) {
          this.logger.warn('Login failed: authentication token missing', {
            email: body.email,
          });
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof WrongAuthenticationTokenException) {
          this.logger.warn('Login failed: wrong authentication token', {
            email: body.email,
          });
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof PasswordResetRequiredException) {
          this.logger.warn('Login failed: password reset required', {
            email: body.email,
          });
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof UserNotActiveException) {
          this.logger.warn('Login failed: user not active', { email: body.email });
          return { status: 401 as const, body: { error: error.message } };
        }
        this.logger.error(
          { message: 'Error logging in user', error },
          { email: body.email }
        );
        return { status: 500 as const, body: { error: serializeError(error) } };
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(contract.auth.changePassword)
  changePassword(@CurrentUser() user: RequestUser) {
    return tsRestHandler(contract.auth.changePassword, async ({ body }) => {
      try {
        await this.authService.changePassword({
          userId: user.userId,
          currentPassword: body.currentPassword,
          newPassword: body.newPassword,
        });
        return {
          status: 200 as const,
          body: { message: 'Password changed successfully' },
        };
      } catch (error) {
        if (error instanceof WrongCredentialsException) {
          this.logger.warn('Change password failed: wrong current password');
          return { status: 400 as const, body: { error: error.message } };
        }
        if (error instanceof AuthenticationTokenMissingException) {
          this.logger.warn('Change password failed: authentication token missing');
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof WrongAuthenticationTokenException) {
          this.logger.warn('Change password failed: wrong authentication token');
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof PasswordResetRequiredException) {
          this.logger.warn('Change password failed: password reset required');
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof UserNotActiveException) {
          this.logger.warn('Change password failed: user not active');
          return { status: 401 as const, body: { error: error.message } };
        }
        this.logger.error({ message: 'Error changing password', error });
        return {
          status: 500 as const,
          body: { error: serializeError(error) },
        };
      }
    });
  }

  @TsRestHandler(contract.auth.resetPassword)
  resetPassword() {
    return tsRestHandler(contract.auth.resetPassword, async ({ body }) => {
      try {
        const result = await this.authService.requestPasswordReset(body.email);
        return { status: 200 as const, body: result };
      } catch (error) {
        this.logger.error(
          { message: 'Error requesting password reset', error },
          { email: body.email }
        );
        return {
          status: 500 as const,
          body: { error: serializeError(error) },
        };
      }
    });
  }

  @TsRestHandler(contract.auth.resetPasswordConfirm)
  resetPasswordConfirm() {
    return tsRestHandler(contract.auth.resetPasswordConfirm, async ({ body }) => {
      try {
        await this.authService.confirmPasswordReset({
          userId: body.userId,
          verificationCode: body.verificationCode,
          newPassword: body.password,
        });
        return {
          status: 200 as const,
          body: { message: 'Password reset successfully' },
        };
      } catch (error) {
        if (error instanceof WrongCredentialsException) {
          this.logger.warn('Reset password confirm failed: wrong verification code', {
            userId: body.userId,
          });
          return { status: 400 as const, body: { error: error.message } };
        }
        this.logger.error(
          { message: 'Error confirming password reset', error },
          { userId: body.userId }
        );
        return {
          status: 500 as const,
          body: { error: serializeError(error) },
        };
      }
    });
  }

  @TsRestHandler(contract.auth.logout)
  logout() {
    return tsRestHandler(contract.auth.logout, async () => {
      this.logger.info('Logout requested');
      return {
        status: 200 as const,
        body: { message: 'Logged out successfully' },
      };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(contract.auth.getCurrentUser)
  getCurrentUser(@CurrentUser() currentUser: RequestUser) {
    return tsRestHandler(contract.auth.getCurrentUser, async () => {
      try {
        const user = await this.userService.getUserById(currentUser.userId);
        return { status: 200 as const, body: user };
      } catch (error) {
        this.logger.error({ message: 'Error getting current user', error });
        return {
          status: 500 as const,
          body: { error: serializeError(error) },
        };
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(contract.auth.generateTwoFactor)
  generateTwoFactor(
    @CurrentUser() user: RequestUser,
    @Res() res: Response
  ) {
    return tsRestHandler(contract.auth.generateTwoFactor, async () => {
      res.status(200);
      await this.authService.generateTwoFactor(user.userId, res);
      throw new Error('STREAMING_RESPONSE_SENT');
    });
  }

  @TsRestHandler(contract.auth.turnOnTwoFactor)
  turnOnTwoFactor(@Req() req: Request) {
    return tsRestHandler(contract.auth.turnOnTwoFactor, async ({ body }) => {
      try {
        const token = getTokenFromHeaders(req.headers);
        if (!token) throw new AuthenticationTokenMissingException();
        const user = await this.authService.getUserFromToken({ token });
        await this.authService.enableTwoFactor({
          userId: user.id,
          code: body.twoFactorAuthenticationCode,
          user,
        });
        return { status: 200 as const, body: {} };
      } catch (error) {
        if (error instanceof AuthenticationTokenMissingException) {
          this.logger.warn('Turn on 2FA failed: authentication token missing');
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof WrongAuthenticationTokenException) {
          this.logger.warn('Turn on 2FA failed: wrong authentication token');
          return { status: 401 as const, body: { error: error.message } };
        }
        this.logger.error({ message: 'Error turning on 2FA', error });
        return {
          status: 500 as const,
          body: { error: serializeError(error) },
        };
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(contract.auth.turnOffTwoFactor)
  turnOffTwoFactor(@CurrentUser() user: RequestUser) {
    return tsRestHandler(contract.auth.turnOffTwoFactor, async () => {
      try {
        await this.authService.disableTwoFactor(user.userId);
        return { status: 200 as const, body: {} };
      } catch (error) {
        if (error instanceof AuthenticationTokenMissingException) {
          this.logger.warn('Turn off 2FA failed: authentication token missing');
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof WrongAuthenticationTokenException) {
          this.logger.warn('Turn off 2FA failed: wrong authentication token');
          return { status: 401 as const, body: { error: error.message } };
        }
        this.logger.error({ message: 'Error turning off 2FA', error });
        return {
          status: 500 as const,
          body: { error: serializeError(error) },
        };
      }
    });
  }

  @TsRestHandler(contract.auth.authenticateTwoFactor)
  authenticateTwoFactor(@Req() req: Request) {
    return tsRestHandler(
      contract.auth.authenticateTwoFactor,
      async ({ body }) => {
        try {
          const token = getTokenFromHeaders(req.headers);
          if (!token) throw new AuthenticationTokenMissingException();
          const user = await this.authService.getUserFromToken({
            token,
            omitSecondFactor: true,
          });
          const tokenResponse = await this.authService.authenticateTwoFactor({
            user,
            code: body.twoFactorAuthenticationCode,
          });
          return {
            status: 200 as const,
            body: { accessToken: tokenResponse.accessToken },
          };
        } catch (error) {
          if (error instanceof AuthenticationTokenMissingException) {
            this.logger.warn(
              '2FA authentication failed: authentication token missing'
            );
            return { status: 401 as const, body: { error: error.message } };
          }
          if (error instanceof WrongAuthenticationTokenException) {
            this.logger.warn('2FA authentication failed: wrong authentication token');
            return { status: 401 as const, body: { error: error.message } };
          }
          this.logger.error({ message: 'Error authenticating 2FA', error });
          return {
            status: 500 as const,
            body: { error: serializeError(error) },
          };
        }
      }
    );
  }
}
