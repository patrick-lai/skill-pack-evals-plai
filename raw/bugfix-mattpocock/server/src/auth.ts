import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { DB } from './db.ts';

export const SESSION_COOKIE = 'quay_session';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type PublicUser = {
  id: string;
  name: string;
  email: string;
};

type UserRow = PublicUser & { password_hash: string };

export function sessionSecret(): string {
  return process.env.JWT_SECRET || 'dev-only-quay-secret';
}

export function hashPassword(password: string): string {
  const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
  return bcrypt.hashSync(password, rounds);
}

export function passwordsMatch(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function setSession(res: Response, userId: string) {
  const token = jwt.sign({ sub: userId }, sessionSecret(), { expiresIn: '7d' });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: WEEK_MS,
    path: '/',
  });
}

export function clearSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function readUserId(req: Request): string | null {
  const header = req.header('authorization');
  let token: string | undefined;
  if (header?.toLowerCase().startsWith('bearer ')) {
    token = header.slice(7).trim();
  } else if (req.cookies && typeof req.cookies[SESSION_COOKIE] === 'string') {
    token = req.cookies[SESSION_COOKIE];
  }
  if (!token) return null;
  try {
    const payload = jwt.verify(token, sessionSecret());
    if (typeof payload === 'string' || typeof payload.sub !== 'string') return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export function userFromRequest(req: Request): PublicUser | null {
  const userId = readUserId(req);
  if (!userId) return null;
  const db = req.app.locals.db as DB;
  const row = db
    .prepare('SELECT id, name, email, password_hash FROM users WHERE id = ?')
    .get(userId) as UserRow | undefined;
  if (!row) return null;
  return { id: row.id, name: row.name, email: row.email };
}
