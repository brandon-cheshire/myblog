import { initServer } from '@ts-rest/express';
import { authContract } from '@myblog/shared';
import { AuthService } from './auth.service';
import { getAuthenticatedUser } from '../utils/auth.helper';
import { AppLogger } from '../common/utils/app-logger/app-logger';
import { serializeError } from '../common/utils/serializeError';
import {
  AuthenticationTokenMissingException,
  PasswordResetRequiredException,
  UserNotActiveException,
  WrongAuthenticationTokenException,
  WrongCredentialsException,
} from './auth.errors';

const s = initServer();
const logger = new AppLogger('AuthController');
const authService = new AuthService();

export const authRouter = s.router(authContract, {
  register: async (ctx) => {
    try {
      const userResponse = await authService.register({
        userData: {
          name: ctx.body.name,
          email: ctx.body.email,
          password: ctx.body.password,
        },
        res: ctx.res,
      });
      return { status: 200 as const, body: userResponse };
    } catch (error) {
      if (error instanceof WrongCredentialsException) {
        logger.warn('Registration failed: wrong credentials', {
          email: ctx.body.email,
        });
        return {
          status: 400 as const,
          body: { error: error.message },
        };
      }

      logger.error(
        { message: 'Error registering user', error },
        { email: ctx.body.email }
      );
      return {
        status: 500 as const,
        body: { error: serializeError(error) },
      };
    }
  },

  login: async (ctx) => {
    try {
      const userResponse = await authService.login({
        email: ctx.body.email,
        password: ctx.body.password,
        res: ctx.res,
      });
      return { status: 200 as const, body: userResponse };
    } catch (error) {
      if (error instanceof WrongCredentialsException) {
        logger.warn('Login failed: wrong credentials', {
          email: ctx.body.email,
        });
        return {
          status: 401 as const,
          body: { error: error.message },
        };
      }

      if (
        error instanceof AuthenticationTokenMissingException ||
        error instanceof WrongAuthenticationTokenException ||
        error instanceof PasswordResetRequiredException ||
        error instanceof UserNotActiveException
      ) {
        logger.warn('Login failed due to auth error', {
          email: ctx.body.email,
          error: error.message,
        });
        return {
          status: 401 as const,
          body: { error: error.message },
        };
      }

      logger.error(
        { message: 'Error logging in user', error },
        { email: ctx.body.email }
      );
      return {
        status: 500 as const,
        body: { error: serializeError(error) },
      };
    }
  },

  changePassword: async (ctx) => {
    try {
      const user = await getAuthenticatedUser(ctx);
      await authService.changePassword({
        userId: user.id,
        currentPassword: ctx.body.currentPassword,
        newPassword: ctx.body.newPassword,
      });
      return {
        status: 200 as const,
        body: { message: 'Password changed successfully' },
      };
    } catch (error) {
      if (error instanceof WrongCredentialsException) {
        logger.warn('Change password failed: wrong current password', {
          userId: (await getAuthenticatedUser(ctx)).id,
        });
        return {
          status: 400 as const,
          body: { error: error.message },
        };
      }

      if (
        error instanceof AuthenticationTokenMissingException ||
        error instanceof WrongAuthenticationTokenException ||
        error instanceof PasswordResetRequiredException ||
        error instanceof UserNotActiveException
      ) {
        logger.warn('Change password failed due to auth error', {
          error: error.message,
        });
        return {
          status: 401 as const,
          body: { error: error.message },
        };
      }

      logger.error(
        { message: 'Error changing password', error },
        { userId: (await getAuthenticatedUser(ctx)).id }
      );
      return {
        status: 500 as const,
        body: { error: serializeError(error) },
      };
    }
  },

  resetPassword: async (ctx) => {
    try {
      const result = await authService.requestPasswordReset(ctx.body.email);
      return { status: 200 as const, body: result };
    } catch (error) {
      logger.error(
        { message: 'Error requesting password reset', error },
        { email: ctx.body.email }
      );
      return {
        status: 500 as const,
        body: { error: serializeError(error) },
      };
    }
  },

  resetPasswordConfirm: async (ctx) => {
    try {
      await authService.confirmPasswordReset({
        userId: ctx.body.userId,
        verificationCode: ctx.body.verificationCode,
        newPassword: ctx.body.password,
      });
      return {
        status: 200 as const,
        body: { message: 'Password reset successfully' },
      };
    } catch (error) {
      if (error instanceof WrongCredentialsException) {
        logger.warn('Reset password confirm failed: wrong verification code', {
          userId: ctx.body.userId,
        });
        return {
          status: 400 as const,
          body: { error: error.message },
        };
      }

      logger.error(
        { message: 'Error confirming password reset', error },
        { userId: ctx.body.userId }
      );
      return {
        status: 500 as const,
        body: { error: serializeError(error) },
      };
    }
  },

  logout: async (ctx) => {
    try {
      const user = await getAuthenticatedUser(ctx);
      logger.info('User logged out', { userId: user.id });
    } catch {
      // No valid session; still clear cookie below
    }
    ctx.res.clearCookie('Authorization', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return {
      status: 200 as const,
      body: { message: 'Logged out successfully' },
    };
  },

  getCurrentUser: async (ctx) => {
    try {
      const user = await getAuthenticatedUser(ctx);
      return { status: 200 as const, body: user };
    } catch (error) {
      if (
        error instanceof AuthenticationTokenMissingException ||
        error instanceof WrongAuthenticationTokenException ||
        error instanceof PasswordResetRequiredException ||
        error instanceof UserNotActiveException
      ) {
        logger.warn('Failed to get current user due to auth error', {
          error: error.message,
        });
        return {
          status: 401 as const,
          body: { error: error.message },
        };
      }

      logger.error({ message: 'Error getting current user', error });
      return {
        status: 500 as const,
        body: { error: serializeError(error) },
      };
    }
  },

  generateTwoFactor: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    ctx.res.status(200);
    await authService.generateTwoFactor(user.id, ctx.res);
    throw new Error('STREAMING_RESPONSE_SENT');
  },

  turnOnTwoFactor: async (ctx) => {
    try {
      const user = await getAuthenticatedUser(ctx);
      await authService.enableTwoFactor({
        userId: user.id,
        code: ctx.body.twoFactorAuthenticationCode,
        user,
      });
      return { status: 200 as const, body: {} };
    } catch (error) {
      if (
        error instanceof AuthenticationTokenMissingException ||
        error instanceof WrongAuthenticationTokenException
      ) {
        logger.warn('Turn on 2FA failed due to auth error', {
          error: error.message,
        });
        return {
          status: 401 as const,
          body: { error: error.message },
        };
      }

      logger.error(
        { message: 'Error turning on 2FA', error },
        { userId: (await getAuthenticatedUser(ctx)).id }
      );
      return {
        status: 500 as const,
        body: { error: serializeError(error) },
      };
    }
  },

  turnOffTwoFactor: async (ctx) => {
    try {
      const user = await getAuthenticatedUser(ctx);
      await authService.disableTwoFactor(user.id);
      return { status: 200 as const, body: {} };
    } catch (error) {
      if (
        error instanceof AuthenticationTokenMissingException ||
        error instanceof WrongAuthenticationTokenException
      ) {
        logger.warn('Turn off 2FA failed due to auth error', {
          error: error.message,
        });
        return {
          status: 401 as const,
          body: { error: error.message },
        };
      }

      logger.error(
        { message: 'Error turning off 2FA', error },
        { userId: (await getAuthenticatedUser(ctx)).id }
      );
      return {
        status: 500 as const,
        body: { error: serializeError(error) },
      };
    }
  },

  authenticateTwoFactor: async (ctx) => {
    try {
      const user = await getAuthenticatedUser(ctx, true);
      const userResponse = await authService.authenticateTwoFactor({
        user,
        code: ctx.body.twoFactorAuthenticationCode,
        res: ctx.res,
      });
      return { status: 200 as const, body: userResponse };
    } catch (error) {
      if (
        error instanceof AuthenticationTokenMissingException ||
        error instanceof WrongAuthenticationTokenException
      ) {
        logger.warn('2FA authentication failed due to auth error', {
          error: error.message,
        });
        return {
          status: 401 as const,
          body: { error: error.message },
        };
      }

      logger.error(
        { message: 'Error authenticating 2FA', error },
        { userId: (await getAuthenticatedUser(ctx, true)).id }
      );
      return {
        status: 500 as const,
        body: { error: serializeError(error) },
      };
    }
  },
});
