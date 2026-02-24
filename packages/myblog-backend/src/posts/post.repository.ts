import { db } from '../database/database';

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

  async create(postData: {
    id: string;
    title: string;
    content: string;
    authorId: string;
    createdAt: string;
    updatedAt: string;
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

  async update(params: {
    id: string;
    updates: { title?: string; content?: string; updatedAt: string };
  }) {
    await db
      .updateTable('posts')
      .set(params.updates)
      .where('id', '=', params.id)
      .execute();
  }

  async delete(id: string): Promise<void> {
    await db.deleteFrom('posts').where('id', '=', id).execute();
  }
}
