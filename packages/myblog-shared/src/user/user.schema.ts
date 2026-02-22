import { z } from 'zod';

// User status types
export const userStatusTypeSchema = z.enum([
  'active',
  'password_reset_required',
]);
export type UserStatusType = z.infer<typeof userStatusTypeSchema>;

// Username validation: 3-30 chars, alphanumeric, dots, hyphens, underscores
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    'Username can only contain letters, numbers, dots, hyphens, and underscores'
  )
  .refine((val) => !val.startsWith('.') && !val.endsWith('.'), {
    message: 'Username cannot start or end with a dot',
  })
  .refine((val) => !val.includes('..'), {
    message: 'Username cannot contain consecutive dots',
  });

// Comprehensive user schema with all fields
export const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required'),
  username: z.string().nullable(),
  profilePicture: z.string().nullable(),
  isTwoFactorAuthenticationEnabled: z.boolean(),
  twoFactorAuthenticationCode: z.string().nullable(),
  status: userStatusTypeSchema,
  verificationCode: z.string().nullable(),
  verificationCodeExpiresAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

import { isValidPassword } from '../utils/validation.utils';

// Registration schema (subset for user creation)
export const userRegistrationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required').refine(isValidPassword, {
    message:
      'Password must be at least 10 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character',
  }),
});

export type UserRegistration = z.infer<typeof userRegistrationSchema>;

// Login schema
export const userLoginSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

export type UserLogin = z.infer<typeof userLoginSchema>;

// API response shape (serialized, no sensitive fields)
export const userResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  username: z.string().nullable().optional(),
  profilePicture: z.string().optional(),
  createdAt: z.string().optional(),
  isTwoFactorEnabled: z.boolean().optional(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

// Username update schema
export const updateUsernameSchema = z.object({
  username: usernameSchema,
});
export type UpdateUsername = z.infer<typeof updateUsernameSchema>;
