-- Migration: Add password_hash column and migrate old password fields
-- Date: 2026-01-11
-- Description: Add password_hash column if it doesn't exist, then migrate data from password column if it exists

-- First, add password_hash column if it doesn't exist
DO $$
BEGIN
    -- Check if 'password_hash' column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'User' 
        AND column_name = 'password_hash'
    ) THEN
        -- Add password_hash column
        ALTER TABLE "User" ADD COLUMN password_hash TEXT;
        
        RAISE NOTICE 'Added password_hash column to User table';
    END IF;
END $$;

-- Then, migrate data from 'password' column to 'password_hash' if 'password' column exists
DO $$
BEGIN
    -- Check if 'password' column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'User' 
        AND column_name = 'password'
    ) THEN
        -- Migrate password to password_hash for users where password_hash is null or empty
        UPDATE "User"
        SET password_hash = password
        WHERE (password_hash IS NULL OR password_hash = '')
        AND password IS NOT NULL
        AND password != '';
        
        -- Drop the old password column after migration
        ALTER TABLE "User" DROP COLUMN IF EXISTS password;
        
        RAISE NOTICE 'Migrated password column to password_hash';
    END IF;
END $$;

-- Set password_reset_required status for users with null/empty password_hash
-- These users will need to reset their password
UPDATE "User"
SET status = 'password_reset_required'
WHERE (password_hash IS NULL OR password_hash = '')
AND status = 'active';

-- Add comment
COMMENT ON COLUMN "User"."password_hash" IS 'Bcrypt hashed password. Users with null/empty password_hash must reset their password.';
