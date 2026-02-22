import type { User } from '@myblog/shared';
import type { UserWithPasswordHash } from './user.types';

export function stripPasswordHash(user: UserWithPasswordHash): User {
  const { password_hash: _, ...rest } = user;
  return rest as User;
}
