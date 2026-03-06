import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@myblog/shared';
import { getAuthPrincipalFromHeaders } from '../auth/auth.helper.js';
import { AppLogger } from '../common/utils/app-logger/app-logger.js';
import { serializeError } from '../common/utils/serializeError.js';
import { PostNotFoundException, NotAuthorizedException } from './post.errors.js';
import { AuthService } from '../auth/auth.service.js';
import { PostService } from './post.service.js';

const logger = new AppLogger('PostsController');

function headersRecord(
  headers: unknown
): Record<string, string | string[] | undefined> {
  return (headers ?? {}) as Record<string, string | string[] | undefined>;
}

@Controller()
export class PostsController {
  constructor(
    private readonly postService: PostService,
    private readonly authService: AuthService
  ) {}

  @TsRestHandler(contract.posts.getPosts)
  getPosts() {
    return tsRestHandler(contract.posts.getPosts, async () => {
      try {
        const posts = await this.postService.getAllPosts();
        return { status: 200 as const, body: posts };
      } catch (error) {
        logger.error({ message: 'Error fetching posts', error });
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
          logger.warn('Post not found', { id: params.id });
          return { status: 404 as const, body: { error: error.message } };
        }
        logger.error(
          { message: 'Error fetching post', error },
          { id: params.id }
        );
        return { status: 500 as const, body: { error: serializeError(error) } };
      }
    });
  }

  @TsRestHandler(contract.posts.createPost)
  createPost() {
    return tsRestHandler(contract.posts.createPost, async ({ body, headers }) => {
      try {
        const { userId } = await getAuthPrincipalFromHeaders(
          headersRecord(headers),
          this.authService
        );
        const post = await this.postService.createPost({
          title: body.title,
          content: body.content,
          authorId: userId,
        });
        return { status: 201 as const, body: post };
      } catch (error) {
        if (error instanceof NotAuthorizedException) {
          logger.warn('Not authorized to create post', {});
          return { status: 401 as const, body: { error: error.message } };
        }
        logger.error(
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

  @TsRestHandler(contract.posts.updatePost)
  updatePost() {
    return tsRestHandler(
      contract.posts.updatePost,
      async ({ params, body, headers }) => {
        try {
          const { userId } = await getAuthPrincipalFromHeaders(
            headersRecord(headers),
            this.authService
          );
          const post = await this.postService.updatePost({
            postId: params.id,
            authorId: userId,
            updates: { title: body.title, content: body.content },
          });
          return { status: 200 as const, body: post };
        } catch (error) {
          if (error instanceof PostNotFoundException) {
            logger.warn('Post not found for update', { id: params.id });
            return { status: 404 as const, body: { error: error.message } };
          }
          if (error instanceof NotAuthorizedException) {
            logger.warn('Not authorized to update post', { id: params.id });
            return { status: 401 as const, body: { error: error.message } };
          }
          logger.error(
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

  @TsRestHandler(contract.posts.deletePost)
  deletePost() {
    return tsRestHandler(
      contract.posts.deletePost,
      async ({ params, headers }) => {
        try {
          const { userId } = await getAuthPrincipalFromHeaders(
            headersRecord(headers),
            this.authService
          );
          await this.postService.deletePost({
            postId: params.id,
            authorId: userId,
          });
          return { status: 200 as const, body: {} };
        } catch (error) {
          if (error instanceof PostNotFoundException) {
            logger.warn('Post not found for deletion', { id: params.id });
            return { status: 404 as const, body: { error: error.message } };
          }
          if (error instanceof NotAuthorizedException) {
            logger.warn('Not authorized to delete post', { id: params.id });
            return { status: 401 as const, body: { error: error.message } };
          }
          logger.error(
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
