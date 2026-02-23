import { initServer } from '@ts-rest/express';
import { userContract } from '@myblog/shared';
import { getAuthenticatedUser } from '../utils/auth.helper';
import { UserService } from './user.service';
import { PostService } from '../posts/post.service';
import { Request, Response } from 'express';
import { AppLogger } from '../common/utils/app-logger/app-logger';
import {
  errorResponse,
  handleControllerError,
} from '../utils/controller-conventions';
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
      return handleControllerError(error, {
        logger,
        context: 'create',
      }) as never;
    }
  },

  getUser: async (ctx) => {
    try {
      const user = await userService.getUserById(ctx.params.id);
      return { status: 200 as const, body: user };
    } catch (error) {
      return handleControllerError(error, {
        logger,
        context: 'getUser',
      }) as never;
    }
  },

  getUserByUsername: async (ctx) => {
    try {
      const user = await userService.getUserByUsername(ctx.params.username);
      return { status: 200 as const, body: user };
    } catch (error) {
      return handleControllerError(error, {
        logger,
        context: 'getUserByUsername',
      }) as never;
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
      return handleControllerError(error, {
        logger,
        context: 'updateUsername',
      }) as never;
    }
  },

  getUserPosts: async (ctx) => {
    try {
      await getAuthenticatedUser(ctx);
      const userId = ctx.params.id;
      const posts = await postService.getPostsByAuthorId(userId);
      return { status: 200 as const, body: posts };
    } catch (error) {
      return handleControllerError(error, {
        logger,
        context: 'getUserPosts',
      }) as never;
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
          return errorResponse(400, 'No file uploaded');
        }
        if (err.message === 'Only image files are allowed') {
          return errorResponse(400, 'Only image files are allowed');
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
          return errorResponse(400, 'File size exceeds 5MB limit');
        }
        return errorResponse(400, err.message ?? 'File upload failed');
      }

      const result = await userService.uploadProfilePicture({
        userId: user.id,
        file,
      });
      return { status: 200 as const, body: result };
    } catch (error) {
      return handleControllerError(error, {
        logger,
        context: 'uploadProfilePicture',
      }) as never;
    }
  },
});
