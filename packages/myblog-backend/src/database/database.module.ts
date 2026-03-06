import { Global, Module } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from './types.js';
import { db } from './database.js';
import { DB } from './tokens.js';

export { DB } from './tokens.js';

@Global()
@Module({
  providers: [
    {
      provide: DB,
      useValue: db as Kysely<Database>,
    },
  ],
  exports: [DB],
})
export class DatabaseModule {}
