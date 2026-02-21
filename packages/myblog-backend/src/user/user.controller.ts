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
    getUser: async (ctx) => {
        try {
            const user = await userService.getUserById(ctx.params.id);
            if (!user) {
                return errorResponse(404, 'User not found');
            }
            return { status: 200 as const, body: user };
        } catch (error) {
            return handleControllerError(error, { logger, context: 'getUser' }) as never;
        }
    },

    getUserByUsername: async (ctx) => {
        try {
            const user = await userService.getUserByUsername(ctx.params.username);
            if (!user) {
                return errorResponse(404, 'User not found');
            }
            return { status: 200 as const, body: user };
        } catch (error) {
            return handleControllerError(error, { logger, context: 'getUserByUsername' }) as never;
        }
    },

    updateUsername: async (ctx) => {
        try {
            const user = await getAuthenticatedUser(ctx);
            const { username } = ctx.body;

            await userService.updateUsername(user.id, username);

            const updatedUser = await userService.getUserById(user.id);
            if (!updatedUser) {
                return errorResponse(404, 'User not found');
            }

            return { status: 200 as const, body: updatedUser };
        } catch (error) {
            return handleControllerError(error, { logger, context: 'updateUsername' }) as never;
        }
    },

    getUserPosts: async (ctx) => {
        try {
            await getAuthenticatedUser(ctx);
            const userId = ctx.params.id;
            const posts = await postService.getPostsByAuthorId(userId);
            return { status: 200 as const, body: posts };
        } catch (error) {
            return handleControllerError(error, { logger, context: 'getUserPosts' }) as never;
        }
    },

    uploadProfilePicture: async (ctx) => {
        try {
            const user = await getAuthenticatedUser(ctx);

            let file: Express.Multer.File;
            try {
                file = await processMulterUpload(ctx.req as Request, ctx.res as Response);
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

            const result = await userService.uploadProfilePicture(user.id, file);
            return { status: 200 as const, body: result };
        } catch (error) {
            return handleControllerError(error, { logger, context: 'uploadProfilePicture' }) as never;
        }
    },
});