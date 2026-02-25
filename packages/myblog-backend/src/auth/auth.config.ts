export function getJwtConfig() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  const expiresInSecondsRaw = process.env.JWT_EXPIRY_SECONDS;
  const expiresInSeconds = expiresInSecondsRaw
    ? Number(expiresInSecondsRaw)
    : 60 * 60;

  if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    throw new Error(
      'JWT_EXPIRY_SECONDS must be a positive number if it is set'
    );
  }

  return {
    secret,
    expiresInSeconds,
  };
}

