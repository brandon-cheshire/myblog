import type { Request } from 'express';
import { AuthenticationTokenMissingException } from './auth.errors';
import type { AuthPrincipal } from './auth.types';
import type { AuthService } from './auth.service';

export function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

export function getTokenFromHeaders(
  headers: Record<string, string | string[] | undefined>
): string | null {
  const authHeader = headers.authorization;
  const value = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (value?.startsWith('Bearer ')) {
    return value.slice(7);
  }
  return null;
}

export async function getAuthPrincipal(
  ctx: { req: Request },
  authService: AuthService,
  omitSecondFactor = false
): Promise<AuthPrincipal> {
  const token = getTokenFromRequest(ctx.req);
  if (!token) {
    throw new AuthenticationTokenMissingException();
  }
  const user = await authService.getUserFromToken({ token, omitSecondFactor });
  return { userId: user.id };
}

export async function getAuthPrincipalFromHeaders(
  headers: Record<string, string | string[] | undefined>,
  authService: AuthService,
  omitSecondFactor = false
): Promise<AuthPrincipal> {
  const token = getTokenFromHeaders(headers);
  if (!token) {
    throw new AuthenticationTokenMissingException();
  }
  const user = await authService.getUserFromToken({ token, omitSecondFactor });
  return { userId: user.id };
}

