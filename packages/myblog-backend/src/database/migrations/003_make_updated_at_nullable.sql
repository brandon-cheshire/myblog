-- Migration: Ensure updatedAt exists and is nullable in User table
-- Date: 2026-01-18
-- Description: Allow updatedAt column to be NULL in User table

DO $$
BEGIN
    -- If "updatedAt" column does NOT exist, create it as nullable
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'User' 
        AND column_name = 'updatedAt'
    ) THEN
        -- If it exists and is NOT NULL, make it nullable
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'User' 
            AND column_name = 'updatedAt'
            AND is_nullable = 'NO'
        ) THEN
            ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP NOT NULL;
            RAISE NOTICE 'Made updatedAt column nullable in User table';
        END IF;
    ELSE
        -- Create the column as nullable if it doesn't exist
        ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP;
        RAISE NOTICE 'Created nullable updatedAt column in User table';
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN "User"."updatedAt" IS 'Timestamp of last update. Can be NULL for newly created users.';
