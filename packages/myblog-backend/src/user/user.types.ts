import type { User } from '@myblog/shared';

export type UserWithPasswordHash = User & { password_hash: string };
