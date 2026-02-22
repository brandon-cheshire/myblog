import type { User } from '@myblog/shared';

export interface UserWithPasswordHash extends User {
  password_hash: string | null;
}
