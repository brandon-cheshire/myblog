import { randomUUID } from 'node:crypto';
import { db } from '../utils/database';
import type { User, UserTable } from '../database/types';
import type { Updateable } from 'kysely';
import type { UserStatusType } from '@myblog/shared';
import { UniqueConstraintViolationException } from '../common/database.errors';

export class UserRepository {
  async findByEmail(email: string): Promise<User | undefined> {
    const user = await db
      .selectFrom('User')
      .where('email', '=', email)
      .selectAll()
      .executeTakeFirst();

    return user;
  }

  async findById(id: string): Promise<User | undefined> {
    const user = await db
      .selectFrom('User')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();

    return user;
  }

  async findByUsername(
    username: string
  ): Promise<User | undefined> {
    const user = await db
      .selectFrom('User')
      .where('username', '=', username)
      .selectAll()
      .executeTakeFirst();

    return user;
  }

  async create(userData: {
    name: string;
    email: string;
    password_hash: string;
    status?: UserStatusType;
    username?: string | null;
  }): Promise<User> {
    const userId = randomUUID();
    const now = new Date().toISOString();
    const newUser = await db
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

    return newUser;
  }

  async update(params: {
    id: string;
    updates: Updateable<UserTable>;
  }): Promise<void> {
    await db
      .updateTable('User')
      .set(params.updates)
      .where('id', '=', params.id)
      .execute();
  }

  async updateTwoFactorCode(params: { id: string; code: string }): Promise<void> {
    await this.update({ id: params.id, updates: { twoFactorAuthenticationCode: params.code } });
  }

  async enableTwoFactor(id: string): Promise<void> {
    await db
      .updateTable('User')
      .set({ isTwoFactorAuthenticationEnabled: true })
      .where('id', '=', id)
      .execute();
  }

  async disableTwoFactor(id: string): Promise<void> {
    await db
      .updateTable('User')
      .set({ isTwoFactorAuthenticationEnabled: false })
      .where('id', '=', id)
      .execute();
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

  async isUsernameTaken(params: {
    username: string;
    excludeUserId?: string;
  }): Promise<boolean> {
    let query = db
      .selectFrom('User')
      .select('id')
      .where('username', '=', params.username);

    if (params.excludeUserId) {
      query = query.where('id', '!=', params.excludeUserId);
    }

    const user = await query.executeTakeFirst();
    return !!user;
  }
}
