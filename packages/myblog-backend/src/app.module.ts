import { Module } from '@nestjs/common';
import { TsRestModule } from '@ts-rest/nest';
import { DatabaseModule } from './database/database.module.js';
import { TransactionModule } from './transaction/transaction.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { PostsModule } from './posts/posts.module.js';
import { AppConfigModule } from './appconfig/appconfig.module.js';

@Module({
  imports: [
    TsRestModule.register({ isGlobal: true, validateResponses: true }),
    AppConfigModule,
    DatabaseModule,
    TransactionModule,
    AuthModule,
    UsersModule,
    PostsModule,
  ],
})
export class AppModule {}
