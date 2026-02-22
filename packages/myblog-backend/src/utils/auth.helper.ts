import jwt from 'jsonwebtoken';
import type { Request } from 'express';
import { DataStoredInToken } from '../auth/auth.service';
import {
  WrongAuthenticationTokenException,
  AuthenticationTokenMissingException,
} from '../auth/auth.errors';
import type { User } from '@myblog/shared';
import { UserRepository } from '../user/user.repository';

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

export async function getAuthenticatedUser(
  ctx: { req: Request },
  omitSecondFactor = false
): Promise<User> {
  const token = getTokenFromRequest(ctx.req);

  if (!token) {
    throw new AuthenticationTokenMissingException();
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  try {
    const verificationResponse = jwt.verify(
      token,
      secret
    ) as unknown as DataStoredInToken;
    const { _id: id, isSecondFactorAuthenticated } = verificationResponse;
    const userRepository = new UserRepository();
    const user = await userRepository.findById(id);

    if (!user) {
      throw new WrongAuthenticationTokenException();
    }

    if (
      !omitSecondFactor &&
      user.isTwoFactorAuthenticationEnabled &&
      !isSecondFactorAuthenticated
    ) {
      throw new WrongAuthenticationTokenException();
    }

    return user;
  } catch (error) {
    if (
      error instanceof WrongAuthenticationTokenException ||
      error instanceof AuthenticationTokenMissingException
    ) {
      throw error;
    }
    throw new WrongAuthenticationTokenException();
  }
}
