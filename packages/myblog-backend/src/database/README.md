# Database Migrations

This directory contains database migration scripts and utilities for managing database schema changes.

## Structure

```
database/
├── migrations/           # SQL migration files
│   ├── 000_init.sql
│   ├── 001_add_user_status_and_verification.sql
│   ├── 002_migrate_old_password_fields.sql
│   ├── 003_make_updated_at_nullable.sql
│   └── 004_add_username.sql
├── migrate.ts           # Migration runner script
└── types.ts             # Database type definitions (Kysely)
```

## Migration Files

Migration files are SQL scripts that modify the database schema. They are run in sorted order (by filename). Naming convention: three-digit number + short description:

| File                                       | Description                                             |
| ------------------------------------------ | ------------------------------------------------------- |
| `000_init.sql`                             | Base schema: `User`, `addresses`, `posts` tables        |
| `001_add_user_status_and_verification.sql` | User status, verification code and expiry columns       |
| `002_migrate_old_password_fields.sql`      | Add `password_hash`, migrate from old `password` column |
| `003_make_updated_at_nullable.sql`         | Make `User.updatedAt` nullable                          |
| `004_add_username.sql`                     | Add unique nullable `username` to `User`                |

Next migration should be named `005_descriptive_name.sql`.

## Running Migrations

From the backend package root (`packages/myblog-backend`):

### Run all pending migrations

```bash
npm run migrate
```

### Or run the script directly

```bash
npx tsx src/database/migrate.ts
```

## Creating New Migrations

1. Create a new SQL file in the `migrations/` directory
2. Name it with the next sequential number (e.g., `005_your_migration.sql`)
3. Add your SQL statements
4. Test the migration on a development database first
5. Commit the migration file

## Migration Best Practices

- **Idempotent**: Migrations should be safe to run multiple times
- **Transactional**: Wrap related changes in transactions when possible
- **Tested**: Test migrations on a copy of production data first
- **Documented**: Add comments explaining what the migration does
- **Backwards Compatible**: Consider rollback strategies

## Example Migration

```sql
-- Migration: Add user preferences table
-- Date: 2026-01-11
-- Description: Create user preferences table for storing user settings

CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'light',
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for performance
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Add comment
COMMENT ON TABLE user_preferences IS 'User preference settings';
```

## Environment Variables

The migration runner uses this environment variable (from your `.env` file in the backend package):

- **`DATABASE_URL`** (required) – PostgreSQL connection string, e.g.  
  `postgresql://user:password@host:port/database`

If `DATABASE_URL` is not set, the script will exit with an error. Make sure your database is running and accessible before running migrations.
