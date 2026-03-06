import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import {
  KyselyTransactionProvider,
  TRANSACTION_PROVIDER,
} from './transaction.provider.js';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: TRANSACTION_PROVIDER,
      useClass: KyselyTransactionProvider,
    },
  ],
  exports: [TRANSACTION_PROVIDER],
})
export class TransactionModule {}
