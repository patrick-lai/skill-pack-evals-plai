import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT = { N: 16384, r: 8, p: 1 } as const;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 32, SCRYPT);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
  const [kind, saltHex, keyHex] = encoded.split('$');
  if (kind !== 'scrypt' || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const salt = Buffer.from(saltHex, 'hex');
  if (expected.length === 0 || salt.length === 0) return false;
  const actual = scryptSync(password, salt, expected.length, SCRYPT);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
