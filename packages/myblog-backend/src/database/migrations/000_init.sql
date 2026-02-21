-- Base schema migration: create initial tables
-- This should run BEFORE any 001+ migrations that alter "User"

-- Create User table (quoted, PascalCase, as used throughout the codebase)
CREATE TABLE IF NOT EXISTS "User" (
    "id" UUID PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "password_hash" TEXT NOT NULL,
    "username" TEXT UNIQUE,
    "profilePicture" TEXT,
    "isTwoFactorAuthenticationEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
    "twoFactorAuthenticationCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "verificationCode" TEXT,
    "verificationCodeExpiresAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP
);

-- Create addresses table
CREATE TABLE IF NOT EXISTS addresses (
    "id" UUID PRIMARY KEY,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
    "id" UUID PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

