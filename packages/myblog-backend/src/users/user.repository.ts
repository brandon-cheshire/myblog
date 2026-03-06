import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Kysely } from 'kysely';
import type { UserRow, UserTable } from '../database/types';
import type { Database } from '../database/types';
import type { Updateable } from 'kysely';
import type { UserStatusType, User } from '@myblog/shared';
import { UniqueConstraintViolationException } from '../common/database.errors';
import type { UserWithPasswordHash } from './user.types';
import {
  TRANSACTION_PROVIDER,
  type TransactionProvider,
} from '../transaction/transaction.provider.js';

@Injectable()
export class UserRepository {
  constructor(
    @Inject(TRANSACTION_PROVIDER)
    private readonly tx: TransactionProvider
  ) {}

  private toUser(user: UserRow): User {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      profilePicture: user.profilePicture,
      isTwoFactorAuthenticationEnabled: user.isTwoFactorAuthenticationEnabled,
      twoFactorAuthenticationCode: user.twoFactorAuthenticationCode,
      status: user.status,
      verificationCode: user.verificationCode,
      verificationCodeExpiresAt: user.verificationCodeExpiresAt
        ? new Date(user.verificationCodeExpiresAt)
        : null,
      createdAt: new Date(user.createdAt),
      updatedAt: user.updatedAt ? new Date(user.updatedAt) : null,
    };
  }

  private toUserWithPasswordHash(user: UserRow): UserWithPasswordHash {
    return {
      ...this.toUser(user),
      password_hash: user.password_hash,
    };
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.tx.withoutTransaction(async (db) => {
      const result = await db
        .selectFrom('User')
        .where('email', '=', email)
        .selectAll()
        .executeTakeFirst();
      return result ? this.toUser(result) : undefined;
    });
  }

  async findByEmailWithPasswordHash(
    email: string
  ): Promise<UserWithPasswordHash | undefined> {
    return this.tx.withoutTransaction(async (db) => {
      const result = await db
        .selectFrom('User')
        .where('email', '=', email)
        .selectAll()
        .executeTakeFirst();
      return result ? this.toUserWithPasswordHash(result) : undefined;
    });
  }

  async findById(id: string): Promise<User | undefined> {
    return this.tx.withoutTransaction(async (db) => {
      const result = await db
        .selectFrom('User')
        .where('id', '=', id)
        .selectAll()
        .executeTakeFirst();
      return result ? this.toUser(result) : undefined;
    });
  }

  async findByIdWithPasswordHash(
    id: string
  ): Promise<UserWithPasswordHash | undefined> {
    return this.tx.withoutTransaction(async (db) => {
      const result = await db
        .selectFrom('User')
        .where('id', '=', id)
        .selectAll()
        .executeTakeFirst();
      return result ? this.toUserWithPasswordHash(result) : undefined;
    });
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return this.tx.withoutTransaction(async (db) => {
      const result = await db
        .selectFrom('User')
        .where('username', '=', username)
        .selectAll()
        .executeTakeFirst();
      return result ? this.toUser(result) : undefined;
    });
  }

  async create(userData: {
    name: string;
    email: string;
    password_hash: string;
    status?: UserStatusType;
    username?: string | null;
  }): Promise<User> {
    return this.tx.withoutTransaction(async (db) => {
      const userId = randomUUID();
      const now = new Date().toISOString();
      const result = await db
        .insertInto('User')
        .values({
          id: userId,
          name: userData.name,
          email: userData.email,
          password_hash: userData.password_hash,
          username: userData.username || null,
          status: (userData.status || 'active') as UserStatusType,
          createdAt: now,
          updatedAt: null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      return this.toUser(result);
    });
  }

  async update(params: {
    id: string;
    updates: Updateable<UserTable>;
  }): Promise<User> {
    return this.tx.withoutTransaction(async (db) => {
      const result = await db
        .updateTable('User')
        .set(params.updates)
        .where('id', '=', params.id)
        .returningAll()
        .executeTakeFirstOrThrow();
      return this.toUser(result);
    });
  }

  async updateTwoFactorCode(params: { id: string; code: string }): Promise<void> {
    await this.update({ id: params.id, updates: { twoFactorAuthenticationCode: params.code } });
  }

  async enableTwoFactor(id: string): Promise<void> {
    return this.tx.withoutTransaction(async (db) => {
      await db
        .updateTable('User')
        .set({ isTwoFactorAuthenticationEnabled: true })
        .where('id', '=', id)
        .execute();
    });
  }

  async disableTwoFactor(id: string): Promise<void> {
    return this.tx.withoutTransaction(async (db) => {
      await db
        .updateTable('User')
        .set({ isTwoFactorAuthenticationEnabled: false })
        .where('id', '=', id)
        .execute();
    });
  }

  async updateProfilePicture(params: {
    id: string;
    filename: string;
  }): Promise<void> {
    await this.update({ id: params.id, updates: { profilePicture: params.filename } });
  }

  async updatePassword(params: {
    id: string;
    passwordHash: string;
  }): Promise<void> {
    await this.update({
      id: params.id,
      updates: {
        password_hash: params.passwordHash,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  async updateVerificationCode(params: {
    id: string;
    code: string;
    expiresAt: string;
  }): Promise<void> {
    await this.update({
      id: params.id,
      updates: {
        verificationCode: params.code,
        verificationCodeExpiresAt: params.expiresAt,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  async clearVerificationCode(id: string): Promise<void> {
    await this.update({
      id,
      updates: {
        verificationCode: null,
        verificationCodeExpiresAt: null,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  async updateStatus(params: {
    id: string;
    status: UserStatusType;
  }): Promise<void> {
    await this.update({ id: params.id, updates: { status: params.status } });
  }

  async updateUsername(params: { id: string; username: string }): Promise<void> {
    try {
      await this.update({
        id: params.id,
        updates: {
          username: params.username,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      const code =
        (err as { code?: string })?.code ??
        (err as { cause?: { code?: string } })?.cause?.code;
      if (code === '23505') {
        throw new UniqueConstraintViolationException();
      }
      throw err;
    }
  }

  async deleteById(id: string): Promise<void> {
    return this.tx.withoutTransaction(async (db) => {
      await db.deleteFrom('User').where('id', '=', id).execute();
    });
  }

  async isUsernameTaken(params: {
    username: string;
    excludeUserId?: string;
  }): Promise<boolean> {
    return this.tx.withoutTransaction(async (db) => {
      let query = db
        .selectFrom('User')
        .select('id')
        .where('username', '=', params.username);

      if (params.excludeUserId) {
        query = query.where('id', '!=', params.excludeUserId);
      }

      const user = await query.executeTakeFirst();
      return !!user;
    });
  }
}
