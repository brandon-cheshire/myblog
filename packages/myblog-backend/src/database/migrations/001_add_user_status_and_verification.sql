-- Migration: Add user status and verification fields
-- Date: 2026-01-11
-- Description: Add status, verificationCode, and verificationCodeExpiresAt columns to User table

-- Add status column with default value 'active' for existing users (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'status'
    ) THEN
        ALTER TABLE "User" ADD COLUMN status TEXT DEFAULT 'active' NOT NULL;
    END IF;
END $$;

-- Add verification code columns (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'verificationCode'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "verificationCode" TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'verificationCodeExpiresAt'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "verificationCodeExpiresAt" TIMESTAMP;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN "User".status IS 'User account status: active, unverified, password_reset_required, inactive';
COMMENT ON COLUMN "User"."verificationCode" IS 'Verification code for password reset and account confirmation';
COMMENT ON COLUMN "User"."verificationCodeExpiresAt" IS 'Expiration timestamp for verification code';