import { initServer } from '@ts-rest/express';
import { userContract } from '@myblog/shared';
import { getAuthenticatedUser } from '../utils/auth.helper';
import { UserService } from './user.service';
import {
  UserNotFoundException,
  UserWithThatEmailAlreadyExistsException,
  UsernameAlreadyTakenException,
} from './user.errors';
import {
  AuthenticationTokenMissingException,
  WrongAuthenticationTokenException,
} from '../auth/auth.errors';
import { PostService } from '../posts/post.service';
import { Request, Response } from 'express';
import { AppLogger } from '../common/utils/app-logger/app-logger';
import { serializeError } from '../common/utils/serializeError';
import { processMulterUpload } from '../utils/upload.utils';

const s = initServer();
const logger = new AppLogger('UserController');
const userService = new UserService();
const postService = new PostService();

export const userRouter = s.router(userContract, {
  create: async (ctx) => {
    try {
      const user = await userService.create(ctx.body);
      return { status: 201 as const, body: user };
    } catch (error) {
      if (error instanceof UserWithThatEmailAlreadyExistsException) {
        logger.warn('User creation conflict', { email: ctx.body.email });
        return {
          status: 409 as const,
          body: { error: error.message },
        };
      }

      if (error instanceof UsernameAlreadyTakenException) {
        logger.warn('Username already taken during create', {
          email: ctx.body.email,
        });
        return {
          status: 409 as const,
          body: { error: error.message },
        };
      }

      logger.error(
        { message: 'Error creating user', error },
        { email: ctx.body.email }
      );
      return {
        status: 500 as const,
        body: { error: serializeError(error) },
      };
    }
  },

  getUser: async (ctx) => {
    try {
      const user = await userService.getUserById(ctx.params.userId);
      return { status: 200 as const, body: user };
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        logger.warn('User not found', { userId: ctx.params.userId });
        return {
          status: 404 as const,
          body: { error: error.message },
        };
      }

      logger.error(
        { message: 'Error fetching user', error },
        { userId: ctx.params.userId }
      );
      return {
        status: 500 as const,
        body: { error: serializeError(error) },
      };
    }
  },

  getUserByUsername: async (ctx) => {
    try {
      const user = await userService.getUserByUsername(ctx.params.username);
      return { status: 200 as const, body: user };
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        logger.warn('User not found by username', {
          username: ctx.params.username,
        });
        return {
          status: 404 as const,
          body: { error: error.message },
        };
      }

      logger.error(
        { message: 'Error fetching user by username', error },
        { username: ctx.params.username }
      );
      return {
        status: 500 as const,
        body: { error: serializeError(error) },
      };
    }
  },

  updateUsername: async (ctx) => {
    try {
      const user = await getAuthenticatedUser(ctx);
      const { username } = ctx.body;
      const updatedUser = await userService.updateUsername({
        userId: user.id,
        username,
      });
      return { status: 200 as const, body: updatedUser };
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        logger.warn('User not found for username update', { userId: ctx.body });
        return {
          status: 404 as const,
          body: { error: error.message },
        };
      }

      if (error instanceof UsernameAlreadyTakenException) {
        logger.warn('Username already taken during update', {
          userId: ctx.body,
          username: ctx.body.username,
        });
        return {
          status: 409 as const,
          body: { error: error.message },
        };
      }

      logger.error(
        { message: 'Error updating username', error },
        { userId: ctx.body }
      );
      return {
        status: 500 as const,
        body: { error: serializeError(error) },
      };
    }
  },

  getUserPosts: async (ctx) => {
    try {
      await getAuthenticatedUser(ctx);
      const userId = ctx.params.userId;
      const posts = await postService.getPostsByAuthorId(userId);
      return { status: 200 as const, body: posts };
    } catch (error) {
      logger.error(
        { message: 'Error fetching user posts', error },
        { userId: ctx.params.userId }
      );
      return {
        status: 500 as const,
        body: { error: serializeError(error) },
      };
    }
  },

  delete: async (ctx) => {
    try {
      const user = await getAuthenticatedUser(ctx);
      const targetId = ctx.params.userId;
      if (user.id !== targetId) {
        return {
          status: 403 as const,
          body: { error: 'You can only delete your own account' },
        };
      }
      await userService.deleteUser(targetId);
      return { status: 204 as const, body: undefined };
    } catch (error) {
      if (
        error instanceof AuthenticationTokenMissingException ||
        error instanceof WrongAuthenticationTokenException
      ) {
        return {
          status: 401 as const,
          body: { error: error.message },
        };
      }
      if (error instanceof UserNotFoundException) {
        logger.warn('User not found for delete', { userId: ctx.params.userId });
        return {
          status: 404 as const,
          body: { error: error.message },
        };
      }
      logger.error(
        { message: 'Error deleting user', error },
        { userId: ctx.params.userId }
      );
      return {
        status: 500 as const,
        body: { error: serializeError(error) },
      };
    }
  },

  uploadProfilePicture: async (ctx) => {
    try {
      const user = await getAuthenticatedUser(ctx);

      let file: Express.Multer.File;
      try {
        file = await processMulterUpload(
          ctx.req as Request,
          ctx.res as Response
        );
      } catch (uploadError: unknown) {
        const err = uploadError as { message?: string; code?: string };
        if (err.message === 'No file uploaded') {
          return {
            status: 400 as const,
            body: { error: 'No file uploaded' },
          };
        }
        if (err.message === 'Only image files are allowed') {
          return {
            status: 400 as const,
            body: { error: 'Only image files are allowed' },
          };
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
          return {
            status: 400 as const,
            body: { error: 'File size exceeds 5MB limit' },
          };
        }
        return {
          status: 400 as const,
          body: { error: err.message ?? 'File upload failed' },
        };
      }

      const result = await userService.uploadProfilePicture({
        userId: user.id,
        file,
      });
      return { status: 200 as const, body: result };
    } catch (error) {
      logger.error(
        { message: 'Error uploading profile picture', error },
        { userId: (await getAuthenticatedUser(ctx)).id }
      );
      return {
        status: 500 as const,
        body: { error: serializeError(error) },
      };
    }
  },
});
