#!/usr/bin/env tsx

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: join(__dirname, '../../../.env') });

if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL is not set. Set it in packages/myblog-backend/.env'
  );
  process.exit(1);
}

const { initLogging } =
  await import('../../common/utils/app-logger/init-logging.js');
initLogging({ isLocal: true });

const name = process.env.SEED_USER_NAME ?? 'Seed User';
const email = process.env.SEED_USER_EMAIL ?? 'seed@example.com';
const password = process.env.SEED_USER_PASSWORD ?? 'Password123!';
const force =
  process.env.SEED_FORCE === 'true' || process.env.SEED_FORCE === '1';

async function seed() {
  const { db } = await import('../../utils/database.js');
  const { UserService } = await import('../../user/user.service.js');
  const { UserWithThatEmailAlreadyExistsException } =
    await import('../../user/user.errors.js');

  const userService = new UserService();

  if (force) {
    await db.deleteFrom('User').where('email', '=', email).execute();
  }

  try {
    await userService.register({ name, email, password });
    console.log(`Seeded user: ${email}`);
  } catch (err) {
    if (err instanceof UserWithThatEmailAlreadyExistsException) {
      console.log(
        `User already exists: ${email}. Set SEED_FORCE=true to replace.`
      );
      return;
    }
    throw err;
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
