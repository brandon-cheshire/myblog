import { initServer } from '@ts-rest/express';
import { postContract } from '@myblog/shared';
import { getAuthenticatedUser } from '../utils/auth.helper';
import { PostService } from './post.service';
import { AppLogger } from '../common/utils/app-logger/app-logger';
import { handleControllerError } from '../utils/controller-conventions';

const s = initServer();
const logger = new AppLogger('PostController');
const postService = new PostService();

export const postRouter = s.router(postContract, {
  getPosts: async () => {
    try {
      const posts = await postService.getAllPosts();
      return { status: 200 as const, body: posts };
    } catch (error) {
      return handleControllerError(error, {
        logger,
        context: 'getPosts',
      }) as never;
    }
  },

  getPost: async (ctx) => {
    try {
      const post = await postService.getPostById(ctx.params.id);
      return { status: 200 as const, body: post };
    } catch (error) {
      return handleControllerError(error, {
        logger,
        context: 'getPost',
      }) as never;
    }
  },

  createPost: async (ctx) => {
    try {
      const user = await getAuthenticatedUser(ctx);
      const post = await postService.createPost({
        title: ctx.body.title,
        content: ctx.body.content,
        authorId: user.id,
      });
      return { status: 201 as const, body: post };
    } catch (error) {
      return handleControllerError(error, {
        logger,
        context: 'createPost',
        validationMessage: 'Invalid data',
      }) as never;
    }
  },

  updatePost: async (ctx) => {
    try {
      const user = await getAuthenticatedUser(ctx);
      const post = await postService.updatePost(ctx.params.id, user.id, {
        title: ctx.body.title,
        content: ctx.body.content,
      });
      return { status: 200 as const, body: post };
    } catch (error) {
      return handleControllerError(error, {
        logger,
        context: 'updatePost',
      }) as never;
    }
  },

  deletePost: async (ctx) => {
    try {
      const user = await getAuthenticatedUser(ctx);
      await postService.deletePost(ctx.params.id, user.id);
      return { status: 200 as const, body: {} };
    } catch (error) {
      return handleControllerError(error, {
        logger,
        context: 'deletePost',
      }) as never;
    }
  },
});
