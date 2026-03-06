import { Controller, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@myblog/shared';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { RequestUser } from '../auth/auth.types.js';
import { AppLogger } from '../common/utils/app-logger/app-logger.js';
import { serializeError } from '../common/utils/serializeError.js';
import { PostNotFoundException, NotAuthorizedException } from './post.errors.js';
import { PostService } from './post.service.js';

@Controller()
export class PostsController {
  private readonly logger = new AppLogger(PostsController.name);

  constructor(private readonly postService: PostService) {}

  @TsRestHandler(contract.posts.getPosts)
  getPosts() {
    return tsRestHandler(contract.posts.getPosts, async () => {
      try {
        const posts = await this.postService.getAllPosts();
        return { status: 200 as const, body: posts };
      } catch (error) {
        this.logger.error({ message: 'Error fetching posts', error });
        return {
          status: 500 as const,
          body: { error: serializeError(error) },
        };
      }
    });
  }

  @TsRestHandler(contract.posts.getPost)
  getPost() {
    return tsRestHandler(contract.posts.getPost, async ({ params }) => {
      try {
        const post = await this.postService.getPostById(params.id);
        return { status: 200 as const, body: post };
      } catch (error) {
        if (error instanceof PostNotFoundException) {
          this.logger.warn('Post not found', { id: params.id });
          return { status: 404 as const, body: { error: error.message } };
        }
        this.logger.error(
          { message: 'Error fetching post', error },
          { id: params.id }
        );
        return { status: 500 as const, body: { error: serializeError(error) } };
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(contract.posts.createPost)
  createPost(@CurrentUser() user: RequestUser) {
    return tsRestHandler(contract.posts.createPost, async ({ body }) => {
      try {
        const post = await this.postService.createPost({
          title: body.title,
          content: body.content,
          authorId: user.userId,
        });
        return { status: 201 as const, body: post };
      } catch (error) {
        if (error instanceof NotAuthorizedException) {
          this.logger.warn('Not authorized to create post', {});
          return { status: 401 as const, body: { error: error.message } };
        }
        this.logger.error(
          { message: 'Error creating post', error },
          { title: body.title }
        );
        return {
          status: 500 as const,
          body: { error: serializeError(error) },
        };
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(contract.posts.updatePost)
  updatePost(@CurrentUser() user: RequestUser) {
    return tsRestHandler(
      contract.posts.updatePost,
      async ({ params, body }) => {
        try {
          const post = await this.postService.updatePost({
            postId: params.id,
            authorId: user.userId,
            updates: { title: body.title, content: body.content },
          });
          return { status: 200 as const, body: post };
        } catch (error) {
          if (error instanceof PostNotFoundException) {
            this.logger.warn('Post not found for update', { id: params.id });
            return { status: 404 as const, body: { error: error.message } };
          }
          if (error instanceof NotAuthorizedException) {
            this.logger.warn('Not authorized to update post', { id: params.id });
            return { status: 401 as const, body: { error: error.message } };
          }
          this.logger.error(
            { message: 'Error updating post', error },
            { id: params.id }
          );
          return {
            status: 500 as const,
            body: { error: serializeError(error) },
          };
        }
      }
    );
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(contract.posts.deletePost)
  deletePost(@CurrentUser() user: RequestUser) {
    return tsRestHandler(
      contract.posts.deletePost,
      async ({ params }) => {
        try {
          await this.postService.deletePost({
            postId: params.id,
            authorId: user.userId,
          });
          return { status: 200 as const, body: {} };
        } catch (error) {
          if (error instanceof PostNotFoundException) {
            this.logger.warn('Post not found for deletion', { id: params.id });
            return { status: 404 as const, body: { error: error.message } };
          }
          if (error instanceof NotAuthorizedException) {
            this.logger.warn('Not authorized to delete post', { id: params.id });
            return { status: 401 as const, body: { error: error.message } };
          }
          this.logger.error(
            { message: 'Error deleting post', error },
            { id: params.id }
          );
          return {
            status: 500 as const,
            body: { error: serializeError(error) },
          };
        }
      }
    );
  }
}
