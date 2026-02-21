import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { Database } from '../database/types.js';

declare global {
  var db: Kysely<Database> | undefined;
}

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
});

const db =
  globalThis.db ||
  new Kysely<Database>({
    dialect,
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.db = db;
}

export { db };
