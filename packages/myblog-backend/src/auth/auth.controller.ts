import { initServer } from '@ts-rest/express';
import { authContract } from '@myblog/shared';
import { AuthService } from './auth.service';
import { getAuthenticatedUser } from '../utils/auth.helper';
import { AppLogger } from '../common/utils/app-logger/app-logger';
import { handleControllerError } from '../utils/controller-conventions';

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
          address: ctx.body.address,
        },
        res: ctx.res,
      });
      const body = {
        ...userResponse,
        profilePicture: userResponse.profilePicture ?? undefined,
        address: userResponse.address ?? undefined,
      };
      return { status: 200 as const, body };
    } catch (error) {
      return handleControllerError(error, {
        logger,
        context: 'register',
      }) as never;
    }
  },

  login: async (ctx) => {
    try {
      const userResponse = await authService.login({
        email: ctx.body.email,
        password: ctx.body.password,
        res: ctx.res,
      });
      const body = {
        ...userResponse,
        profilePicture:
          (userResponse as { profilePicture?: string | null }).profilePicture ??
          undefined,
      };
      return { status: 200 as const, body };
    } catch (error) {
      return handleControllerError(error, {
        logger,
        context: 'login',
      }) as never;
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
      return handleControllerError(error, {
        logger,
        context: 'changePassword',
      }) as never;
    }
  },

  resetPassword: async (ctx) => {
    try {
      const result = await authService.requestPasswordReset(ctx.body.email);
      return { status: 200 as const, body: result };
    } catch (error) {
      return handleControllerError(error, {
        logger,
        context: 'resetPassword',
      }) as never;
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
      return handleControllerError(error, {
        logger,
        context: 'resetPasswordConfirm',
      }) as never;
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
      return {
        status: 200 as const,
        body: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username ?? undefined,
          address: user.address ?? undefined,
          profilePicture: user.profilePicture ?? undefined,
          createdAt: user.createdAt.toISOString(),
          isTwoFactorEnabled: user.isTwoFactorAuthenticationEnabled,
        },
      };
    } catch (error) {
      return handleControllerError(error, {
        logger,
        context: 'getCurrentUser',
      }) as never;
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
      return handleControllerError(error, {
        logger,
        context: 'turnOnTwoFactor',
      }) as never;
    }
  },

  turnOffTwoFactor: async (ctx) => {
    try {
      const user = await getAuthenticatedUser(ctx);
      await authService.disableTwoFactor(user.id);
      return { status: 200 as const, body: {} };
    } catch (error) {
      return handleControllerError(error, {
        logger,
        context: 'turnOffTwoFactor',
      }) as never;
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
      const body = {
        ...userResponse,
        profilePicture: userResponse.profilePicture ?? undefined,
        address: userResponse.address ?? undefined,
      };
      return { status: 200 as const, body };
    } catch (error) {
      return handleControllerError(error, {
        logger,
        context: 'authenticateTwoFactor',
      }) as never;
    }
  },
});
