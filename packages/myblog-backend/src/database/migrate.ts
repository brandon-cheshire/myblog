#!/usr/bin/env tsx

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables from the backend .env file
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../.env') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set.');
  console.error('   Make sure your .env file contains DATABASE_URL=postgresql://user:password@host:port/database');
  process.exit(1);
}

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATIONS_DIR = join(__dirname, 'migrations');

interface MigrationResult {
  file: string;
  executed: boolean;
  error?: string;
}

async function runMigrations(): Promise<void> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1, // Single connection for migrations
  });

  try {
    console.log('🔄 Starting database migrations...\n');

    // Get all migration files
    const migrationFiles = await fs.readdir(MIGRATIONS_DIR);
    const sqlFiles = migrationFiles
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure consistent order

    if (sqlFiles.length === 0) {
      console.log('ℹ️  No migration files found.');
      return;
    }

    console.log(`📁 Found ${sqlFiles.length} migration file(s):`);
    sqlFiles.forEach(file => console.log(`   - ${file}`));
    console.log('');

    const results: MigrationResult[] = [];

    for (const file of sqlFiles) {
      const filePath = join(MIGRATIONS_DIR, file);
      console.log(`🔄 Executing migration: ${file}`);

      try {
        // Read migration file
        const sql = await fs.readFile(filePath, 'utf-8');

        // Execute migration
        await pool.query(sql);

        results.push({ file, executed: true });
        console.log(`✅ Successfully executed: ${file}\n`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to execute: ${file}`);
        console.error(`   Error: ${errorMessage}\n`);

        results.push({ file, executed: false, error: errorMessage });

        // Continue with next migration or stop?
        // For now, we'll continue but you might want to stop on first error
      }
    }

    // Summary
    console.log('📊 Migration Summary:');
    console.log('='.repeat(50));

    const successful = results.filter(r => r.executed);
    const failed = results.filter(r => !r.executed);

    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);

    if (failed.length > 0) {
      console.log('\n❌ Failed migrations:');
      failed.forEach(result => {
        console.log(`   - ${result.file}: ${result.error}`);
      });
      process.exit(1);
    }

    console.log('\n🎉 All migrations completed successfully!');

  } catch (error) {
    console.error('💥 Migration runner failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().catch(console.error);
}

export { runMigrations };