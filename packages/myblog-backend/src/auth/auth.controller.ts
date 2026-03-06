import { Controller, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request, Response } from 'express';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@myblog/shared';
import {
  getAuthPrincipalFromHeaders,
  getTokenFromHeaders,
} from './auth.helper.js';
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

const logger = new AppLogger('AuthController');

function headersRecord(
  headers: unknown
): Record<string, string | string[] | undefined> {
  return (headers ?? {}) as Record<string, string | string[] | undefined>;
}

@Controller({ scope: Scope.REQUEST })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(REQUEST) private readonly request: Request & { res?: Response }
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
          logger.warn('Registration failed: wrong credentials', {
            email: body.email,
          });
          return { status: 400 as const, body: { error: error.message } };
        }
        logger.error(
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
          logger.warn('Login failed: wrong credentials', { email: body.email });
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof AuthenticationTokenMissingException) {
          logger.warn('Login failed: authentication token missing', {
            email: body.email,
          });
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof WrongAuthenticationTokenException) {
          logger.warn('Login failed: wrong authentication token', {
            email: body.email,
          });
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof PasswordResetRequiredException) {
          logger.warn('Login failed: password reset required', {
            email: body.email,
          });
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof UserNotActiveException) {
          logger.warn('Login failed: user not active', { email: body.email });
          return { status: 401 as const, body: { error: error.message } };
        }
        logger.error(
          { message: 'Error logging in user', error },
          { email: body.email }
        );
        return { status: 500 as const, body: { error: serializeError(error) } };
      }
    });
  }

  @TsRestHandler(contract.auth.changePassword)
  changePassword() {
    return tsRestHandler(contract.auth.changePassword, async ({ body, headers }) => {
      try {
        const { userId } = await getAuthPrincipalFromHeaders(
          headersRecord(headers),
          this.authService
        );
        await this.authService.changePassword({
          userId,
          currentPassword: body.currentPassword,
          newPassword: body.newPassword,
        });
        return {
          status: 200 as const,
          body: { message: 'Password changed successfully' },
        };
      } catch (error) {
        if (error instanceof WrongCredentialsException) {
          logger.warn('Change password failed: wrong current password');
          return { status: 400 as const, body: { error: error.message } };
        }
        if (error instanceof AuthenticationTokenMissingException) {
          logger.warn('Change password failed: authentication token missing');
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof WrongAuthenticationTokenException) {
          logger.warn('Change password failed: wrong authentication token');
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof PasswordResetRequiredException) {
          logger.warn('Change password failed: password reset required');
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof UserNotActiveException) {
          logger.warn('Change password failed: user not active');
          return { status: 401 as const, body: { error: error.message } };
        }
        logger.error({ message: 'Error changing password', error });
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
        logger.error(
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
          logger.warn('Reset password confirm failed: wrong verification code', {
            userId: body.userId,
          });
          return { status: 400 as const, body: { error: error.message } };
        }
        logger.error(
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
      logger.info('Logout requested');
      return {
        status: 200 as const,
        body: { message: 'Logged out successfully' },
      };
    });
  }

  @TsRestHandler(contract.auth.getCurrentUser)
  getCurrentUser() {
    return tsRestHandler(contract.auth.getCurrentUser, async ({ headers }) => {
      try {
        const token = getTokenFromHeaders(headersRecord(headers));
        if (!token) throw new AuthenticationTokenMissingException();
        const user = await this.authService.getUserFromToken({ token });
        return { status: 200 as const, body: user };
      } catch (error) {
        if (error instanceof AuthenticationTokenMissingException) {
          logger.warn('Get current user failed: authentication token missing');
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof WrongAuthenticationTokenException) {
          logger.warn('Get current user failed: wrong authentication token');
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof PasswordResetRequiredException) {
          logger.warn('Get current user failed: password reset required');
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof UserNotActiveException) {
          logger.warn('Get current user failed: user not active');
          return { status: 401 as const, body: { error: error.message } };
        }
        logger.error({ message: 'Error getting current user', error });
        return {
          status: 500 as const,
          body: { error: serializeError(error) },
        };
      }
    });
  }

  @TsRestHandler(contract.auth.generateTwoFactor)
  generateTwoFactor() {
    return tsRestHandler(contract.auth.generateTwoFactor, async ({ headers }) => {
      const { userId } = await getAuthPrincipalFromHeaders(
        headersRecord(headers),
        this.authService
      );
      const res = this.request.res;
      if (!res) throw new Error('Response not available');
      res.status(200);
      await this.authService.generateTwoFactor(userId, res);
      throw new Error('STREAMING_RESPONSE_SENT');
    });
  }

  @TsRestHandler(contract.auth.turnOnTwoFactor)
  turnOnTwoFactor() {
    return tsRestHandler(contract.auth.turnOnTwoFactor, async ({ body, headers }) => {
      try {
        const token = getTokenFromHeaders(headersRecord(headers));
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
          logger.warn('Turn on 2FA failed: authentication token missing');
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof WrongAuthenticationTokenException) {
          logger.warn('Turn on 2FA failed: wrong authentication token');
          return { status: 401 as const, body: { error: error.message } };
        }
        logger.error({ message: 'Error turning on 2FA', error });
        return {
          status: 500 as const,
          body: { error: serializeError(error) },
        };
      }
    });
  }

  @TsRestHandler(contract.auth.turnOffTwoFactor)
  turnOffTwoFactor() {
    return tsRestHandler(contract.auth.turnOffTwoFactor, async ({ headers }) => {
      try {
        const { userId } = await getAuthPrincipalFromHeaders(
          headersRecord(headers),
          this.authService
        );
        await this.authService.disableTwoFactor(userId);
        return { status: 200 as const, body: {} };
      } catch (error) {
        if (error instanceof AuthenticationTokenMissingException) {
          logger.warn('Turn off 2FA failed: authentication token missing');
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof WrongAuthenticationTokenException) {
          logger.warn('Turn off 2FA failed: wrong authentication token');
          return { status: 401 as const, body: { error: error.message } };
        }
        logger.error({ message: 'Error turning off 2FA', error });
        return {
          status: 500 as const,
          body: { error: serializeError(error) },
        };
      }
    });
  }

  @TsRestHandler(contract.auth.authenticateTwoFactor)
  authenticateTwoFactor() {
    return tsRestHandler(
      contract.auth.authenticateTwoFactor,
      async ({ body, headers }) => {
        try {
          const token = getTokenFromHeaders(headersRecord(headers));
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
            logger.warn(
              '2FA authentication failed: authentication token missing'
            );
            return { status: 401 as const, body: { error: error.message } };
          }
          if (error instanceof WrongAuthenticationTokenException) {
            logger.warn('2FA authentication failed: wrong authentication token');
            return { status: 401 as const, body: { error: error.message } };
          }
          logger.error({ message: 'Error authenticating 2FA', error });
          return {
            status: 500 as const,
            body: { error: serializeError(error) },
          };
        }
      }
    );
  }
}
