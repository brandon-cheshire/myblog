import { ColumnType, Generated, Selectable } from 'kysely';
import { UserStatusType } from '@myblog/shared';

export interface Database {
  User: UserTable;
  posts: PostTable;
}

export interface UserTable {
  id: Generated<string>;
  name: string;
  email: string;
  password_hash: string;
  username: string | null;
  profilePicture: string | null;
  isTwoFactorAuthenticationEnabled: Generated<boolean>;
  twoFactorAuthenticationCode: string | null;
  status: UserStatusType;
  verificationCode: string | null;
  verificationCodeExpiresAt: ColumnType<
    Date,
    string | undefined,
    string | null
  > | null;
  createdAt: ColumnType<Date, string | undefined, never>;
  updatedAt: ColumnType<Date, string | undefined, string | null> | null;
}

export type UserRow = Selectable<UserTable>;

export interface PostTable {
  id: Generated<string>;
  title: string;
  content: string;
  authorId: string;
  createdAt: ColumnType<Date, string | undefined, never>;
  updatedAt: ColumnType<Date, string | undefined, string>;
}
