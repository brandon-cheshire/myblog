import { z } from 'zod';

export const postSchema = z.object({
  title: z.string(),
  content: z.string(),
});

export type Post = z.infer<typeof postSchema>;

const postAuthorSchema = z.object({
  _id: z.string(),
  name: z.string(),
  email: z.string(),
  username: z.string().nullable().optional(),
  profilePicture: z.string().optional(),
});

export const postResponseSchema = z.object({
  _id: z.string(),
  title: z.string(),
  content: z.string(),
  author: postAuthorSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PostResponse = z.infer<typeof postResponseSchema>;
