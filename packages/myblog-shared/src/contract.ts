import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { postSchema, postResponseSchema } from './post/post.schema';
import {
  loginSchema,
  registrationSchema,
  twoFactorAuthenticationCodeSchema,
  changePasswordSchema,
  resetPasswordSchema,
  resetPasswordConfirmSchema,
} from './auth/auth.schema';
import {
  CreateUserDtoSchema,
  updateUsernameSchema,
  UserSchema,
} from './users/user.schema';

const c = initContract();

export const userContract = c.router({
  create: {
    method: 'POST',
    path: '/users',
    body: CreateUserDtoSchema,
    responses: {
      201: UserSchema,
      400: z.object({
        error: z.string(),
        details: z
          .array(
            z.object({
              field: z.string(),
              message: z.string(),
            })
          )
          .optional(),
      }),
      409: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Create a new user (name used for username, email, password)',
  },
  getUser: {
    method: 'GET',
    path: '/users/:userId',
    pathParams: z.object({ userId: z.string() }),
    responses: {
      200: UserSchema,
      404: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Get a user by id',
  },
  getUserPosts: {
    method: 'GET',
    path: '/users/:userId/posts',
    pathParams: z.object({ userId: z.string() }),
    responses: {
      200: z.array(postResponseSchema),
      401: z.object({ error: z.string() }),
      403: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Get posts by a specific user',
  },
  uploadProfilePicture: {
    method: 'POST',
    path: '/users/profile-picture',
    contentType: 'multipart/form-data',
    body: z.any(), // File upload - handled by multer
    responses: {
      200: z.object({ profilePicture: z.string() }),
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Upload profile picture',
  },
  updateUsername: {
    method: 'PATCH',
    path: '/users/username',
    body: updateUsernameSchema,
    responses: {
      200: UserSchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
      409: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Update user username',
  },
  getUserByUsername: {
    method: 'GET',
    path: '/users/username/:username',
    pathParams: z.object({ username: z.string() }),
    responses: {
      200: UserSchema,
      404: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Get a user by username',
  },
  delete: {
    method: 'DELETE',
    path: '/users/:userId',
    pathParams: z.object({ userId: z.string() }),
    responses: {
      204: z.undefined(),
      401: z.object({ error: z.string() }),
      403: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Delete the authenticated user (own account only)',
  },
});

export const postContract = c.router({
  getPosts: {
    method: 'GET',
    path: '/posts',
    responses: {
      200: z.array(postResponseSchema),
      500: z.object({ error: z.string() }),
    },
    summary: 'Get all posts',
  },
  getPost: {
    method: 'GET',
    path: '/posts/:id',
    pathParams: z.object({ id: z.string() }),
    responses: {
      200: postResponseSchema,
      404: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Get a post by id',
  },
  createPost: {
    method: 'POST',
    path: '/posts',
    body: postSchema,
    responses: {
      201: postResponseSchema,
      400: z.object({
        error: z.string(),
        details: z.array(z.object({ field: z.string(), message: z.string() })),
      }),
      401: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Create a new post',
  },
  updatePost: {
    method: 'PATCH',
    path: '/posts/:id',
    pathParams: z.object({ id: z.string() }),
    body: postSchema.partial(),
    responses: {
      200: postResponseSchema,
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Update a post',
  },
  deletePost: {
    method: 'DELETE',
    path: '/posts/:id',
    pathParams: z.object({ id: z.string() }),
    responses: {
      200: z.object({}),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Delete a post',
  },
});

export const authContract = c.router({
  getCurrentUser: {
    method: 'GET',
    path: '/auth/me',
    responses: {
      200: UserSchema,
      401: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Get current authenticated user',
  },
  register: {
    method: 'POST',
    path: '/auth/register',
    body: registrationSchema,
    responses: {
      200: UserSchema.extend({ token: z.string().optional() }),
      400: z.object({
        error: z.string(),
        details: z
          .array(
            z.object({
              field: z.string(),
              message: z.string(),
            })
          )
          .optional(),
      }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Register a new user',
  },
  login: {
    method: 'POST',
    path: '/auth/login',
    body: loginSchema,
    responses: {
      200: UserSchema.extend({ token: z.string().optional() }),
      401: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Login a user',
  },
  logout: {
    method: 'POST',
    path: '/auth/logout',
    body: z.object({}),
    responses: {
      200: z.object({ message: z.string() }),
    },
    summary: 'Logout current user',
  },
  authenticateTwoFactor: {
    method: 'POST',
    path: '/auth/2fa/authenticate',
    body: twoFactorAuthenticationCodeSchema,
    responses: {
      200: UserSchema.extend({ token: z.string().optional() }),
      401: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Authenticate with 2FA code',
  },
  generateTwoFactor: {
    method: 'POST',
    path: '/auth/2fa/generate',
    body: z.object({}),
    responses: {
      200: z.any(), // Returns PNG image blob
    },
    summary: 'Generate 2FA QR code',
  },
  turnOnTwoFactor: {
    method: 'POST',
    path: '/auth/2fa/turn-on',
    body: twoFactorAuthenticationCodeSchema,
    responses: {
      200: z.object({}),
      401: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Enable 2FA after verification',
  },
  turnOffTwoFactor: {
    method: 'POST',
    path: '/auth/2fa/turn-off',
    body: z.object({}),
    responses: {
      200: z.object({}),
      401: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Disable 2FA',
  },
  changePassword: {
    method: 'POST',
    path: '/auth/change-password',
    body: changePasswordSchema,
    responses: {
      200: z.object({ message: z.string() }),
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Change user password',
  },
  resetPassword: {
    method: 'POST',
    path: '/auth/reset-password',
    body: resetPasswordSchema,
    responses: {
      200: z.object({ message: z.string() }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Request password reset',
  },
  resetPasswordConfirm: {
    method: 'POST',
    path: '/auth/reset-password-confirm',
    body: resetPasswordConfirmSchema,
    responses: {
      200: z.object({ message: z.string() }),
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Confirm password reset with verification code',
  },
});

// Combine all contracts
export const contract = c.router({
  users: userContract,
  posts: postContract,
  auth: authContract,
});
