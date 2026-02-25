import { initServer } from '@ts-rest/express';
import { postContract } from '@myblog/shared';
import { getAuthPrincipal } from '../auth/auth.helper';
import { PostService } from './post.service';
import { AppLogger } from '../common/utils/app-logger/app-logger';
import { serializeError } from '../common/utils/serializeError';
import { PostNotFoundException, NotAuthorizedException } from './post.errors';

const s = initServer();
const logger = new AppLogger('PostController');
const postService = new PostService();

export const postRouter = s.router(postContract, {
  getPosts: async () => {
    try {
      const posts = await postService.getAllPosts();
      return { status: 200 as const, body: posts };
    } catch (error) {
      logger.error({ message: 'Error fetching posts', error });
      return {
        status: 500 as const,
        body: { error: serializeError(error) },
      };
    }
  },

  getPost: async (ctx) => {
    try {
      const post = await postService.getPostById(ctx.params.id);
      return { status: 200 as const, body: post };
    } catch (error) {
      if (error instanceof PostNotFoundException) {
        logger.warn('Post not found', { id: ctx.params.id });
        return {
          status: 404 as const,
          body: { error: error.message },
        };
      }

      logger.error(
        { message: 'Error fetching post', error },
        { id: ctx.params.id }
      );
      return {
        status: 500 as const,
        body: { error: serializeError(error) },
      };
    }
  },

  createPost: async (ctx) => {
    try {
      const { userId } = await getAuthPrincipal(ctx);
      const post = await postService.createPost({
        title: ctx.body.title,
        content: ctx.body.content,
        authorId: userId,
      });
      return { status: 201 as const, body: post };
    } catch (error) {
      if (error instanceof NotAuthorizedException) {
        logger.warn('Not authorized to create post', {});
        return {
          status: 401 as const,
          body: { error: error.message },
        };
      }

      logger.error(
        { message: 'Error creating post', error },
        { title: ctx.body.title }
      );
      return {
        status: 500 as const,
        body: { error: serializeError(error) },
      };
    }
  },

  updatePost: async (ctx) => {
    try {
      const { userId } = await getAuthPrincipal(ctx);
      const post = await postService.updatePost({
        postId: ctx.params.id,
        authorId: userId,
        updates: {
          title: ctx.body.title,
          content: ctx.body.content,
        },
      });
      return { status: 200 as const, body: post };
    } catch (error) {
      if (error instanceof PostNotFoundException) {
        logger.warn('Post not found for update', { id: ctx.params.id });
        return {
          status: 404 as const,
          body: { error: error.message },
        };
      }

      if (error instanceof NotAuthorizedException) {
        logger.warn('Not authorized to update post', { id: ctx.params.id });
        return {
          status: 401 as const,
          body: { error: error.message },
        };
      }

      logger.error(
        { message: 'Error updating post', error },
        { id: ctx.params.id }
      );
      return {
        status: 500 as const,
        body: { error: serializeError(error) },
      };
    }
  },

  deletePost: async (ctx) => {
    try {
      const { userId } = await getAuthPrincipal(ctx);
      await postService.deletePost({
        postId: ctx.params.id,
        authorId: userId,
      });
      return { status: 200 as const, body: {} };
    } catch (error) {
      if (error instanceof PostNotFoundException) {
        logger.warn('Post not found for deletion', { id: ctx.params.id });
        return {
          status: 404 as const,
          body: { error: error.message },
        };
      }

      if (error instanceof NotAuthorizedException) {
        logger.warn('Not authorized to delete post', { id: ctx.params.id });
        return {
          status: 401 as const,
          body: { error: error.message },
        };
      }

      logger.error(
        { message: 'Error deleting post', error },
        { id: ctx.params.id }
      );
      return {
        status: 500 as const,
        body: { error: serializeError(error) },
      };
    }
  },
});
