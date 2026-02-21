import * as bcrypt from 'bcrypt';

/**
 * Hashes data using bcrypt with automatic salt generation
 */
export function hashData(rawData: string): string {
  const salt = bcrypt.genSaltSync();
  return bcrypt.hashSync(rawData, salt);
}

/**
 * Compares raw data with a bcrypt hash
 */
export function compareHashedData(
  rawData: string,
  hash: string | null | undefined,
): boolean {
  if (!rawData || !hash) {
    return false;
  }
  return bcrypt.compareSync(rawData, hash);
}