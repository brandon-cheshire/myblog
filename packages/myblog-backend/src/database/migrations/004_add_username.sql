-- Migration: Add username field to User table
-- Date: 2026-01-26
-- Description: Add username column with unique constraint for custom profile URLs

-- Add username column (nullable for existing users, they can set it later)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'username'
    ) THEN
        ALTER TABLE "User" ADD COLUMN username TEXT;
    END IF;
END $$;

-- Create unique index on username (only for non-null values)
-- This allows multiple NULL values but ensures uniqueness for set usernames
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'user_username_unique'
    ) THEN
        CREATE UNIQUE INDEX user_username_unique ON "User" (username) WHERE username IS NOT NULL;
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN "User".username IS 'Unique username for custom profile URLs (e.g., /profile/username)';
