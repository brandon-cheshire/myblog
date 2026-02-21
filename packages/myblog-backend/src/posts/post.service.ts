import { randomUUID } from 'node:crypto';
import type { PostResponse } from '@myblog/shared';
import { PostRepository, type PostWithAuthor } from './post.repository';
import { PostNotFoundException, NotAuthorizedException } from './post.errors';
import { AppLogger } from '../common/utils/app-logger/app-logger';

export class PostService {
  private readonly logger = new AppLogger(PostService.name);
  private postRepository = new PostRepository();

  /**
     * Transform PostWithAuthor to PostResponse format
     */
  private transformPost(post: PostWithAuthor): PostResponse {
    return {
      _id: post.id,
      title: post.title,
      content: post.content,
      author: post.authorId ? {
        _id: post.authorId,
        name: post.name!,
        email: post.email!,
        username: post.username || undefined,
        profilePicture: post.profilePicture || undefined,
      } : undefined,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }

  /**
     * Get all posts
     */
  async getAllPosts(): Promise<PostResponse[]> {
    const posts = await this.postRepository.findAll();
    return posts.map(post => this.transformPost(post));
  }

  /**
     * Get a post by ID
     */
  async getPostById(id: string): Promise<PostResponse> {
    const post = await this.postRepository.findById(id);
    if (!post) {
      throw new PostNotFoundException(id);
    }
    return this.transformPost(post);
  }

  /**
     * Get posts by author ID
     */
  async getPostsByAuthorId(authorId: string): Promise<PostResponse[]> {
    const posts = await this.postRepository.findByAuthorId(authorId);
    return posts.map(post => this.transformPost(post));
  }

  /**
     * Create a new post
     */
  async createPost(data: {
        title: string;
        content: string;
        authorId: string;
    }): Promise<PostResponse> {
    const postId = randomUUID();
    const now = new Date();

    await this.postRepository.create({
      id: postId,
      title: data.title,
      content: data.content,
      authorId: data.authorId,
      createdAt: now,
      updatedAt: now,
    });

    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new Error('Failed to create post');
    }

    this.logger.info('Post created', { postId, authorId: data.authorId });

    return this.transformPost(post);
  }

  /**
     * Update a post
     */
  async updatePost(postId: string, authorId: string, updates: {
        title?: string;
        content?: string;
    }): Promise<PostResponse> {
    // Verify post exists and belongs to user
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new PostNotFoundException(postId);
    }

    if (post.authorId !== authorId) {
      throw new NotAuthorizedException();
    }

    // Update post
    const updatedAt = new Date();
    await this.postRepository.update(postId, {
      ...updates,
      updatedAt,
    });

    const updatedPost = await this.postRepository.findById(postId);
    if (!updatedPost) {
      throw new PostNotFoundException(postId);
    }

    this.logger.info('Post updated', { postId, authorId });

    return this.transformPost(updatedPost);
  }

  /**
     * Delete a post
     */
  async deletePost(postId: string, authorId: string): Promise<void> {
    // Verify post exists and belongs to user
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new PostNotFoundException(postId);
    }

    if (post.authorId !== authorId) {
      throw new NotAuthorizedException();
    }

    await this.postRepository.delete(postId);
    this.logger.info('Post deleted', { postId, authorId });
  }
}
