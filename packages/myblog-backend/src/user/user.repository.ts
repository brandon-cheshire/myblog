import { randomUUID } from 'node:crypto';
import { db } from '../utils/database';
import type { User, UserTable } from '../database/types';
import type { UserWithPasswordHash } from '../user/user.types';
import type { Updateable } from 'kysely';
import type { UserStatusType } from '@myblog/shared';

export class UserRepository {
  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<UserWithPasswordHash | undefined> {
    const user = await db
      .selectFrom('User')
      .where('email', '=', email)
      .selectAll()
      .executeTakeFirst();

    return user as UserWithPasswordHash | undefined;
  }

  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<UserWithPasswordHash | undefined> {
    const user = await db
      .selectFrom('User')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();

    return user as UserWithPasswordHash | undefined;
  }

  /**
   * Find a user by username
   */
  async findByUsername(
    username: string
  ): Promise<UserWithPasswordHash | undefined> {
    const user = await db
      .selectFrom('User')
      .where('username', '=', username)
      .selectAll()
      .executeTakeFirst();

    return user as UserWithPasswordHash | undefined;
  }

  /**
   * Find a user by ID with address
   */
  async findByIdWithAddress(id: string) {
    const user = await db
      .selectFrom('User')
      .leftJoin('addresses', 'User.id', 'addresses.userId')
      .where('User.id', '=', id)
      .select([
        'User.id',
        'User.name',
        'User.email',
        'User.username',
        'User.profilePicture',
        'User.createdAt',
        'User.isTwoFactorAuthenticationEnabled',
        'addresses.id as address_id',
        'addresses.street',
        'addresses.city',
        'addresses.country',
      ])
      .executeTakeFirst();

    return user;
  }

  /**
   * Find a user by username with address
   */
  async findByUsernameWithAddress(username: string) {
    const user = await db
      .selectFrom('User')
      .leftJoin('addresses', 'User.id', 'addresses.userId')
      .where('User.username', '=', username)
      .select([
        'User.id',
        'User.name',
        'User.email',
        'User.username',
        'User.profilePicture',
        'User.createdAt',
        'User.isTwoFactorAuthenticationEnabled',
        'addresses.id as address_id',
        'addresses.street',
        'addresses.city',
        'addresses.country',
      ])
      .executeTakeFirst();

    return user;
  }

  /**
   * Create a new user
   */
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

    // Strip password hash from return
    const { password_hash: _, ...user } = newUser;
    return user as User;
  }

  /**
   * Update user
   */
  async update(id: string, updates: Updateable<UserTable>): Promise<void> {
    await db.updateTable('User').set(updates).where('id', '=', id).execute();
  }

  /**
   * Update user's 2FA code
   */
  async updateTwoFactorCode(id: string, code: string): Promise<void> {
    await this.update(id, { twoFactorAuthenticationCode: code });
  }

  /**
   * Enable 2FA for user
   */
  async enableTwoFactor(id: string): Promise<void> {
    await db
      .updateTable('User')
      .set({ isTwoFactorAuthenticationEnabled: true })
      .where('id', '=', id)
      .execute();
  }

  /**
   * Disable 2FA for user
   */
  async disableTwoFactor(id: string): Promise<void> {
    await db
      .updateTable('User')
      .set({ isTwoFactorAuthenticationEnabled: false })
      .where('id', '=', id)
      .execute();
  }

  /**
   * Update profile picture
   */
  async updateProfilePicture(id: string, filename: string): Promise<void> {
    await this.update(id, { profilePicture: filename });
  }

  /**
   * Update password hash
   */
  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.update(id, {
      password_hash: passwordHash,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Update verification code and expiry
   */
  async updateVerificationCode(
    id: string,
    code: string,
    expiresAt: string
  ): Promise<void> {
    await this.update(id, {
      verificationCode: code,
      verificationCodeExpiresAt: expiresAt,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Clear verification code
   */
  async clearVerificationCode(id: string): Promise<void> {
    await this.update(id, {
      verificationCode: null,
      verificationCodeExpiresAt: null,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Update user status
   */
  async updateStatus(id: string, status: UserStatusType): Promise<void> {
    await this.update(id, { status });
  }

  /**
   * Update username
   */
  async updateUsername(id: string, username: string): Promise<void> {
    await this.update(id, {
      username,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Check if username is taken
   */
  async isUsernameTaken(
    username: string,
    excludeUserId?: string
  ): Promise<boolean> {
    const query = db
      .selectFrom('User')
      .select('id')
      .where('username', '=', username);

    if (excludeUserId) {
      query.where('id', '!=', excludeUserId);
    }

    const user = await query.executeTakeFirst();
    return !!user;
  }
}
