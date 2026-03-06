export type AuthPrincipal = {
  userId: string;
};

/** Set on request.user by JwtStrategy; use with @CurrentUser() on protected routes. */
export type RequestUser = {
  userId: string;
};

