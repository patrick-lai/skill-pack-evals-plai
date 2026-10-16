import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import type Database from 'better-sqlite3';
import type { User } from '@boardline/shared';

const COOKIE = 'boardline_session';
const MAX_AGE = 60 * 60 * 24 * 7;

export function createSession(db: Database.Database, userId: string, now = new Date()): string {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(now.getTime() + MAX_AGE * 1000).toISOString();
  db.prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`).run(
    token,
    userId,
    expires,
  );
  return token;
}

export function userForToken(db: Database.Database, token: string, now = new Date()): User | null {
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .get(token, now.toISOString()) as User | undefined;
  return row ?? null;
}

export function deleteSession(db: Database.Database, token: string): void {
  db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}

export function readCookie(header: string | undefined, name = COOKIE): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function userFromRequest(db: Database.Database, req: Request): User | null {
  const token = readCookie(req.headers.cookie);
  if (!token) return null;
  return userForToken(db, token);
}

export function setSessionCookie(res: Response, token: string): void {
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`);
}

export function clearSessionCookie(res: Response): void {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}
