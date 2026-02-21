import jwt from 'jsonwebtoken';
import type { Request } from 'express';
import { DataStoredInToken } from '../auth/auth.service';
import { db } from './database';
import {
  WrongAuthenticationTokenException,
  AuthenticationTokenMissingException,
} from '../auth/auth.errors';
import type { User } from '../database/types';

function getTokenFromRequest(req: Request): string | null {
  const cookies = req.cookies;
  if (cookies?.Authorization) {
    return cookies.Authorization;
  }
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

export async function getAuthenticatedUser(ctx: { req: Request }, omitSecondFactor = false): Promise<User> {
  const token = getTokenFromRequest(ctx.req);

  if (!token) {
    throw new AuthenticationTokenMissingException();
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  try {
    const verificationResponse = jwt.verify(token, secret) as unknown as DataStoredInToken;
    const { _id: id, isSecondFactorAuthenticated } = verificationResponse;
    const user = await db
      .selectFrom('User')
      .leftJoin('addresses', 'User.id', 'addresses.userId')
      .where('User.id', '=', id)
      .select([
        'User.id',
        'User.name',
        'User.email',
        'User.username',
        'User.password_hash',
        'User.profilePicture',
        'User.status',
        'User.isTwoFactorAuthenticationEnabled',
        'User.twoFactorAuthenticationCode',
        'User.verificationCode',
        'User.verificationCodeExpiresAt',
        'User.createdAt',
        'User.updatedAt',
        'addresses.id as address_id',
        'addresses.street',
        'addresses.city',
        'addresses.country',
        'addresses.userId',
      ])
      .executeTakeFirst();

    if (!user) {
      throw new WrongAuthenticationTokenException();
    }

    // Transform the flat result back to nested structure
    const userWithAddress: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      password_hash: user.password_hash,
      profilePicture: user.profilePicture,
      status: user.status,
      isTwoFactorAuthenticationEnabled: user.isTwoFactorAuthenticationEnabled,
      twoFactorAuthenticationCode: user.twoFactorAuthenticationCode,
      verificationCode: user.verificationCode,
      verificationCodeExpiresAt: user.verificationCodeExpiresAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      address: user.address_id ? {
        id: user.address_id,
        street: user.street!,
        city: user.city!,
        country: user.country!,
        userId: user.userId!,
      } : null,
    };

    if (!omitSecondFactor && userWithAddress.isTwoFactorAuthenticationEnabled && !isSecondFactorAuthenticated) {
      throw new WrongAuthenticationTokenException();
    }

    return userWithAddress;
  } catch (error) {
    if (error instanceof WrongAuthenticationTokenException || error instanceof AuthenticationTokenMissingException) {
      throw error;
    }
    throw new WrongAuthenticationTokenException();
  }
}
