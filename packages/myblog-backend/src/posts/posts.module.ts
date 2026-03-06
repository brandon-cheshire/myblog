import { Module } from '@nestjs/common';
import { PostRepository } from './post.repository.js';
import { PostService } from './post.service.js';
import { PostsController } from './posts.controller.js';
import { TransactionModule } from '../transaction/transaction.module.js';

/**
 * Posts module (3-layer: Controller → Service → Repository).
 * Owns: PostRepository, PostService, PostsController (getPosts, getPost, createPost, etc.).
 * No AuthModule import; AuthModule is @Global() so AuthService is resolved from the container.
 */
@Module({
  imports: [TransactionModule],
  controllers: [PostsController],
  providers: [PostRepository, PostService],
  exports: [PostService],
})
export class PostsModule {}
