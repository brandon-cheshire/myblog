import type { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthenticationTokenMissingException } from './auth.errors';
import type { User } from '@myblog/shared';

const authService = new AuthService();

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

  return authService.getUserFromToken({ token, omitSecondFactor });
}

