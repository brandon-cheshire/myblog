import { Controller, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request, Response } from 'express';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@myblog/shared';
import { getAuthPrincipalFromHeaders } from '../auth/auth.helper.js';
import {
  UserNotFoundException,
  UserWithThatEmailAlreadyExistsException,
  UsernameAlreadyTakenException,
} from './user.errors.js';
import {
  AuthenticationTokenMissingException,
  WrongAuthenticationTokenException,
} from '../auth/auth.errors.js';
import { AppLogger } from '../common/utils/app-logger/app-logger.js';
import { serializeError } from '../common/utils/serializeError.js';
import { processMulterUpload } from '../utils/upload.utils.js';
import { AuthService } from '../auth/auth.service.js';
import { UserService } from './user.service.js';
import { PostService } from '../posts/post.service.js';

const logger = new AppLogger('UserController');

function headersRecord(
  headers: unknown
): Record<string, string | string[] | undefined> {
  return (headers ?? {}) as Record<string, string | string[] | undefined>;
}

@Controller({ scope: Scope.REQUEST })
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly postService: PostService,
    private readonly authService: AuthService,
    @Inject(REQUEST) private readonly request: Request & { res?: Response }
  ) {}

  @TsRestHandler(contract.users.create)
  create() {
    return tsRestHandler(contract.users.create, async ({ body }) => {
      try {
        const user = await this.userService.create(body);
        return { status: 201 as const, body: user };
      } catch (error) {
        if (error instanceof UserWithThatEmailAlreadyExistsException) {
          logger.warn('User creation conflict', { email: body.email });
          return { status: 409 as const, body: { error: error.message } };
        }
        if (error instanceof UsernameAlreadyTakenException) {
          logger.warn('Username already taken during create', {
            email: body.email,
          });
          return { status: 409 as const, body: { error: error.message } };
        }
        logger.error(
          { message: 'Error creating user', error },
          { email: body.email }
        );
        return { status: 500 as const, body: { error: serializeError(error) } };
      }
    });
  }

  @TsRestHandler(contract.users.getUser)
  getUser() {
    return tsRestHandler(contract.users.getUser, async ({ params }) => {
      try {
        const user = await this.userService.getUserById(params.id);
        return { status: 200 as const, body: user };
      } catch (error) {
        if (error instanceof UserNotFoundException) {
          logger.warn('User not found', { id: params.id });
          return { status: 404 as const, body: { error: error.message } };
        }
        logger.error(
          { message: 'Error fetching user', error },
          { id: params.id }
        );
        return { status: 500 as const, body: { error: serializeError(error) } };
      }
    });
  }

  @TsRestHandler(contract.users.getUserByUsername)
  getUserByUsername() {
    return tsRestHandler(
      contract.users.getUserByUsername,
      async ({ params }) => {
        try {
          const user =
            await this.userService.getUserByUsername(params.username);
          return { status: 200 as const, body: user };
        } catch (error) {
          if (error instanceof UserNotFoundException) {
            logger.warn('User not found by username', {
              username: params.username,
            });
            return { status: 404 as const, body: { error: error.message } };
          }
          logger.error(
            { message: 'Error fetching user by username', error },
            { username: params.username }
          );
          return {
            status: 500 as const,
            body: { error: serializeError(error) },
          };
        }
      }
    );
  }

  @TsRestHandler(contract.users.updateUsername)
  updateUsername() {
    return tsRestHandler(
      contract.users.updateUsername,
      async ({ body, headers }) => {
        try {
          const { userId } = await getAuthPrincipalFromHeaders(
            headersRecord(headers),
            this.authService
          );
          const updatedUser = await this.userService.updateUsername({
            userId,
            username: body.username,
          });
          return { status: 200 as const, body: updatedUser };
        } catch (error) {
          if (error instanceof UserNotFoundException) {
            logger.warn('User not found for username update', { userId: body });
            return { status: 404 as const, body: { error: error.message } };
          }
          if (error instanceof UsernameAlreadyTakenException) {
            logger.warn('Username already taken during update', {
              userId: body,
              username: body.username,
            });
            return { status: 409 as const, body: { error: error.message } };
          }
          logger.error(
            { message: 'Error updating username', error },
            { userId: body }
          );
          return {
            status: 500 as const,
            body: { error: serializeError(error) },
          };
        }
      }
    );
  }

  @TsRestHandler(contract.users.getUserPosts)
  getUserPosts() {
    return tsRestHandler(
      contract.users.getUserPosts,
      async ({ params, headers }) => {
        try {
          await getAuthPrincipalFromHeaders(
            headersRecord(headers),
            this.authService
          );
          const posts =
            await this.postService.getPostsByAuthorId(params.id);
          return { status: 200 as const, body: posts };
        } catch (error) {
          logger.error(
            { message: 'Error fetching user posts', error },
            { id: params.id }
          );
          return {
            status: 500 as const,
            body: { error: serializeError(error) },
          };
        }
      }
    );
  }

  @TsRestHandler(contract.users.uploadProfilePicture)
  uploadProfilePicture() {
    return tsRestHandler(
      contract.users.uploadProfilePicture,
      async () => {
        try {
          const { userId } = await getAuthPrincipalFromHeaders(
            headersRecord(this.request.headers),
            this.authService
          );
          const res = this.request.res;
          if (!res) throw new Error('Response not available');
          let file: Express.Multer.File;
          try {
            file = await processMulterUpload(this.request, res);
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
          const result = await this.userService.uploadProfilePicture({
            userId,
            file,
          });
          return { status: 200 as const, body: result };
        } catch (error) {
          logger.error({
            message: 'Error uploading profile picture',
            error,
          });
          return {
            status: 500 as const,
            body: { error: serializeError(error) },
          };
        }
      }
    );
  }

  @TsRestHandler(contract.users.delete)
  delete() {
    return tsRestHandler(contract.users.delete, async ({ params, headers }) => {
      try {
        const { userId } = await getAuthPrincipalFromHeaders(
          headersRecord(headers),
          this.authService
        );
        if (userId !== params.id) {
          return {
            status: 403 as const,
            body: { error: 'You can only delete your own account' },
          };
        }
        await this.userService.delete(params.id);
        return { status: 200 as const, body: {} };
      } catch (error) {
        if (error instanceof AuthenticationTokenMissingException) {
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof WrongAuthenticationTokenException) {
          return { status: 401 as const, body: { error: error.message } };
        }
        if (error instanceof UserNotFoundException) {
          logger.warn('User not found for deletion', { id: params.id });
          return { status: 404 as const, body: { error: error.message } };
        }
        logger.error(
          { message: 'Error deleting user', error },
          { id: params.id }
        );
        return {
          status: 500 as const,
          body: { error: serializeError(error) },
        };
      }
    });
  }
}
