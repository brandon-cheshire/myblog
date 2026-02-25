import type { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthenticationTokenMissingException } from './auth.errors';
import type { AuthPrincipal } from './auth.types';

const authService = new AuthService();

export function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

export async function getAuthPrincipal(
  ctx: { req: Request },
  omitSecondFactor = false
): Promise<AuthPrincipal> {
  const token = getTokenFromRequest(ctx.req);

  if (!token) {
    throw new AuthenticationTokenMissingException();
  }

  const user = await authService.getUserFromToken({ token, omitSecondFactor });
  return { userId: user.id };
}

