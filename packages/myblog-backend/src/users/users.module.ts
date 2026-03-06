import { Module, forwardRef } from '@nestjs/common';
import { UserController } from './user.controller.js';
import { UserRepository } from './user.repository.js';
import { UserService } from './user.service.js';
import { PostsModule } from '../posts/posts.module.js';
import { TransactionModule } from '../transaction/transaction.module.js';

/**
 * User module (3-layer: Controller → Service → Repository).
 * Owns: UserRepository, UserService, UserController (create, getUser, updateUsername, etc.).
 * No AuthModule import; AuthModule is @Global() so AuthService is resolved from the container.
 */
@Module({
  imports: [TransactionModule, forwardRef(() => PostsModule)],
  controllers: [UserController],
  providers: [UserRepository, UserService],
  exports: [UserService, UserRepository],
})
export class UsersModule {}
