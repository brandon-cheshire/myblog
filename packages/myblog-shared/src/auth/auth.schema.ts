import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().min(1, 'Email is required'),
    password: z.string().min(1, 'Password is required'),
});

export type LogIn = z.infer<typeof loginSchema>;

import { isValidPassword } from '../utils/validation.utils';

export const registrationSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().min(1, 'Email is required'),
    password: z.string().min(1, 'Password is required').refine(isValidPassword, {
        message: 'Password must be at least 10 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character'
    }),
    address: z.object({
        street: z.string(),
        city: z.string(),
        country: z.string(),
    }).optional()
});

export type Register = z.infer<typeof registrationSchema>;

export const twoFactorAuthenticationCodeSchema = z.object({
    twoFactorAuthenticationCode: z.string().min(1, 'Two-factor authentication code is required'),
});

export type TwoFactorAuthenticationCode = z.infer<typeof twoFactorAuthenticationCodeSchema>;

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(1, 'New password is required').refine(isValidPassword, {
        message: 'New password must be at least 10 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character'
    }),
});

export type ChangePassword = z.infer<typeof changePasswordSchema>;

export const resetPasswordSchema = z.object({
    email: z.string().min(1, 'Email is required'),
});

export type ResetPassword = z.infer<typeof resetPasswordSchema>;

export const resetPasswordConfirmSchema = z.object({
    userId: z.string(),
    verificationCode: z.string().min(1, 'Verification code is required'),
    password: z.string().min(1, 'Password is required').refine(isValidPassword, {
        message: 'Password must be at least 10 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character'
    }),
});

export type ResetPasswordConfirm = z.infer<typeof resetPasswordConfirmSchema>;

