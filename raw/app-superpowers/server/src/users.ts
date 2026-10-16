import type Database from 'better-sqlite3';
import type { User } from '@boardline/shared';

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
};

export function publicUser(row: { id: string; email: string; name: string }): User {
  return { id: row.id, email: row.email, name: row.name };
}

export function insertUser(
  db: Database.Database,
  user: { id: string; email: string; name: string; passwordHash: string; createdAt: string },
): void {
  db.prepare(
    `INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)`,
  ).run(user.id, user.email, user.name, user.passwordHash, user.createdAt);
}

export function getUserByEmail(db: Database.Database, email: string): UserRow | undefined {
  return db.prepare(`SELECT id, email, name, password_hash FROM users WHERE email = ?`).get(email) as
    | UserRow
    | undefined;
}
