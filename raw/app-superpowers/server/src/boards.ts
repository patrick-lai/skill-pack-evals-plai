import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { BoardDetail, BoardSummary, Member, MemberRole } from '@boardline/shared';
import { listTasks } from './taskStore';

type Membership = { role: MemberRole };

export function membership(db: Database.Database, boardId: string, userId: string): Membership | undefined {
  return db
    .prepare(`SELECT role FROM board_members WHERE board_id = ? AND user_id = ?`)
    .get(boardId, userId) as Membership | undefined;
}

export function createBoard(db: Database.Database, ownerId: string, name: string): BoardSummary {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const insert = db.transaction(() => {
    db.prepare(`INSERT INTO boards (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)`).run(
      id,
      name,
      ownerId,
      createdAt,
    );
    db.prepare(`INSERT INTO board_members (board_id, user_id, role) VALUES (?, ?, 'owner')`).run(id, ownerId);
  });
  insert();
  return { id, name, role: 'owner', taskCount: 0, createdAt };
}

export function listBoards(db: Database.Database, userId: string): BoardSummary[] {
  const rows = db
    .prepare(
      `SELECT b.id, b.name, b.created_at, bm.role,
              (SELECT COUNT(*) FROM tasks t WHERE t.board_id = b.id) AS task_count
       FROM boards b
       JOIN board_members bm ON bm.board_id = b.id
       WHERE bm.user_id = ?
       ORDER BY b.created_at ASC`,
    )
    .all(userId) as Array<{
    id: string;
    name: string;
    created_at: string;
    role: MemberRole;
    task_count: number;
  }>;
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    role: row.role,
    taskCount: row.task_count,
    createdAt: row.created_at,
  }));
}

export function getBoard(db: Database.Database, boardId: string, userId: string): BoardDetail | undefined {
  const role = membership(db, boardId, userId);
  if (!role) return undefined;
  const board = db.prepare(`SELECT id, name, created_at FROM boards WHERE id = ?`).get(boardId) as
    | { id: string; name: string; created_at: string }
    | undefined;
  if (!board) return undefined;
  return {
    id: board.id,
    name: board.name,
    role: role.role,
    createdAt: board.created_at,
    members: listMembers(db, boardId),
    tasks: listTasks(db, boardId),
  };
}

export function listMembers(db: Database.Database, boardId: string): Member[] {
  const rows = db
    .prepare(
      `SELECT u.id, u.email, u.name, bm.role
       FROM board_members bm
       JOIN users u ON u.id = bm.user_id
       WHERE bm.board_id = ?
       ORDER BY CASE bm.role WHEN 'owner' THEN 0 ELSE 1 END, u.name`,
    )
    .all(boardId) as Member[];
  return rows;
}

export function renameBoard(db: Database.Database, boardId: string, userId: string, name: string): BoardSummary {
  db.prepare(`UPDATE boards SET name = ? WHERE id = ?`).run(name, boardId);
  const summary = listBoards(db, userId).find((board) => board.id === boardId);
  if (!summary) throw new Error('Board disappeared during rename');
  return summary;
}

export function deleteBoard(db: Database.Database, boardId: string): void {
  db.prepare(`DELETE FROM boards WHERE id = ?`).run(boardId);
}

export function addMember(
  db: Database.Database,
  boardId: string,
  email: string,
): { ok: true; member: Member } | { ok: false; status: 404 | 409; error: string } {
  const user = db.prepare(`SELECT id, email, name FROM users WHERE email = ?`).get(email) as
    | { id: string; email: string; name: string }
    | undefined;
  if (!user) return { ok: false, status: 404, error: 'No account with that email.' };
  const existing = membership(db, boardId, user.id);
  if (existing) return { ok: false, status: 409, error: 'That person is already on this board.' };
  db.prepare(`INSERT INTO board_members (board_id, user_id, role) VALUES (?, ?, 'member')`).run(boardId, user.id);
  return { ok: true, member: { id: user.id, email: user.email, name: user.name, role: 'member' } };
}

export function removeMember(
  db: Database.Database,
  boardId: string,
  userId: string,
): { ok: true } | { ok: false; status: 400 | 404; error: string } {
  const existing = membership(db, boardId, userId);
  if (!existing) return { ok: false, status: 404, error: 'Board not found.' };
  if (existing.role === 'owner') return { ok: false, status: 400, error: 'The owner cannot be removed.' };
  const now = new Date().toISOString();
  const run = db.transaction(() => {
    db.prepare(`UPDATE tasks SET assignee_id = NULL, updated_at = ? WHERE board_id = ? AND assignee_id = ?`).run(
      now,
      boardId,
      userId,
    );
    db.prepare(`DELETE FROM board_members WHERE board_id = ? AND user_id = ?`).run(boardId, userId);
  });
  run();
  return { ok: true };
}
