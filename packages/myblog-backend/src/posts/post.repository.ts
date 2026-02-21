import { db } from '../utils/database';

export interface PostWithAuthor {
  id: string;
  title: string;
  content: string;
  authorId: string | null;
  createdAt: Date;
  updatedAt: Date;
  name: string | null;
  email: string | null;
  username: string | null;
  profilePicture: string | null;
}

export class PostRepository {
  /**
   * Find all posts with author information
   */
  async findAll(): Promise<PostWithAuthor[]> {
    const posts = await db
      .selectFrom('posts')
      .leftJoin('User', 'posts.authorId', 'User.id')
      .select([
        'posts.id',
        'posts.title',
        'posts.content',
        'posts.authorId',
        'posts.createdAt',
        'posts.updatedAt',
        'User.name',
        'User.email',
        'User.username',
        'User.profilePicture',
      ])
      .orderBy('posts.createdAt', 'desc')
      .execute();

    return posts as PostWithAuthor[];
  }

  /**
   * Find a post by ID with author information
   */
  async findById(id: string): Promise<PostWithAuthor | undefined> {
    const post = await db
      .selectFrom('posts')
      .leftJoin('User', 'posts.authorId', 'User.id')
      .where('posts.id', '=', id)
      .select([
        'posts.id',
        'posts.title',
        'posts.content',
        'posts.authorId',
        'posts.createdAt',
        'posts.updatedAt',
        'User.name',
        'User.email',
        'User.username',
        'User.profilePicture',
      ])
      .executeTakeFirst();

    return post as PostWithAuthor | undefined;
  }

  /**
   * Find posts by author ID
   */
  async findByAuthorId(authorId: string): Promise<PostWithAuthor[]> {
    const posts = await db
      .selectFrom('posts')
      .leftJoin('User', 'posts.authorId', 'User.id')
      .where('posts.authorId', '=', authorId)
      .select([
        'posts.id',
        'posts.title',
        'posts.content',
        'posts.authorId',
        'posts.createdAt',
        'posts.updatedAt',
        'User.name',
        'User.email',
        'User.username',
        'User.profilePicture',
      ])
      .orderBy('posts.createdAt', 'desc')
      .execute();

    return posts as PostWithAuthor[];
  }

  /**
   * Create a new post
   */
  async create(postData: {
    id: string;
    title: string;
    content: string;
    authorId: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const post = await db
      .insertInto('posts')
      .values({
        id: postData.id,
        title: postData.title,
        content: postData.content,
        authorId: postData.authorId,
        createdAt: postData.createdAt,
        updatedAt: postData.updatedAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return post;
  }

  /**
   * Update a post
   */
  async update(
    id: string,
    updates: { title?: string; content?: string; updatedAt: Date }
  ) {
    await db.updateTable('posts').set(updates).where('id', '=', id).execute();
  }

  /**
   * Delete a post
   */
  async delete(id: string): Promise<void> {
    await db.deleteFrom('posts').where('id', '=', id).execute();
  }
}
