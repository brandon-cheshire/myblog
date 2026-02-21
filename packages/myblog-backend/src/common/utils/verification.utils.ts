import * as crypto from 'crypto';

/**
 * Generate a random verification code
 */
export function generateVerificationCode(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate verification code expiry (24 hours from now)
 */
export function generateVerificationCodeExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry;
}

/**
 * Check if verification code is expired
 */
export function isVerificationCodeExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) {
    return true;
  }
  return new Date() > expiresAt;
}
