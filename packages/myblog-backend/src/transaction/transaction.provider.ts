import { Inject, Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '../database/types.js';
import { DB } from '../database/tokens.js';

export type DatabaseTransaction = Kysely<Database>;

/** Alias for use as the second parameter in repository methods per guidelines. */
export type Transaction = DatabaseTransaction;

export interface TransactionProvider {
  withTransaction<R>(
    fn: (trx: DatabaseTransaction) => Promise<R>
  ): Promise<R>;
  withoutTransaction<R>(
    fn: (trx: DatabaseTransaction) => Promise<R>
  ): Promise<R>;
}

@Injectable()
export class KyselyTransactionProvider implements TransactionProvider {
  constructor(
    @Inject(DB) private readonly db: Kysely<Database>
  ) {}

  async withTransaction<R>(
    fn: (trx: DatabaseTransaction) => Promise<R>
  ): Promise<R> {
    return this.db.transaction().execute((trx) => fn(trx as DatabaseTransaction));
  }

  async withoutTransaction<R>(
    fn: (trx: DatabaseTransaction) => Promise<R>
  ): Promise<R> {
    return fn(this.db);
  }
}

export const TRANSACTION_PROVIDER = 'TRANSACTION_PROVIDER';
