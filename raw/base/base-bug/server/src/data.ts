import { randomUUID } from 'node:crypto';
import type { DB } from './db.ts';
import { HttpError } from './errors.ts';
import { hashPassword, passwordsMatch, type PublicUser } from './auth.ts';

export const STATUSES = ['todo', 'doing', 'done'] as const;
export type Status = (typeof STATUSES)[number];
export type Role = 'owner' | 'member';

export type Member = PublicUser & { role: Role };

export type Task = {
  id: string;
  boardId: string;
  title: string;
  description: string;
  status: Status;
  assigneeId: string | null;
  assignee: PublicUser | null;
  dueDate: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type BoardSummary = {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  counts: Record<Status, number>;
  members: Member[];
};

export type BoardDetail = BoardSummary & { tasks: Task[] };

type UserRow = PublicUser & { password_hash: string; created_at: string };

type BoardAccessRow = {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  role: Role;
};

type TaskJoinRow = {
  id: string;
  board_id: string;
  title: string;
  description: string;
  status: Status;
  assignee_id: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  assignee_name: string | null;
  assignee_email: string | null;
};

function now(): string {
  return new Date().toISOString();
}

function touchBoard(db: DB, boardId: string, stamp = now()) {
  db.prepare('UPDATE boards SET updated_at = ? WHERE id = ?').run(stamp, boardId);
}

function publicUser(row: PublicUser): PublicUser {
  return { id: row.id, name: row.name, email: row.email };
}

export function createUser(
  db: DB,
  input: { name: string; email: string; password: string },
): PublicUser {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(input.email);
  if (existing) {
    throw new HttpError(409, 'An account with that email already exists');
  }
  const user: PublicUser = {
    id: randomUUID(),
    name: input.name,
    email: input.email,
  };
  db.prepare(
    'INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(user.id, user.email, user.name, hashPassword(input.password), now());
  return user;
}

export function authenticate(
  db: DB,
  email: string,
  password: string,
): PublicUser {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
  if (!row || !passwordsMatch(password, row.password_hash)) {
    throw new HttpError(401, 'Email or password is incorrect');
  }
  return publicUser(row);
}

function listMembers(db: DB, boardId: string): Member[] {
  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.email, bm.role
       FROM board_members bm
       JOIN users u ON u.id = bm.user_id
       WHERE bm.board_id = ?
       ORDER BY CASE bm.role WHEN 'owner' THEN 0 ELSE 1 END, u.name COLLATE NOCASE`,
    )
    .all(boardId) as Member[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
  }));
}

function countTasks(db: DB, boardId: string): Record<Status, number> {
  const counts: Record<Status, number> = { todo: 0, doing: 0, done: 0 };
  const rows = db
    .prepare('SELECT status, COUNT(*) AS count FROM tasks WHERE board_id = ? GROUP BY status')
    .all(boardId) as { status: Status; count: number }[];
  for (const row of rows) counts[row.status] = row.count;
  return counts;
}

function presentTask(row: TaskJoinRow): Task {
  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    description: row.description,
    status: row.status,
    assigneeId: row.assignee_id,
    assignee:
      row.assignee_id && row.assignee_name && row.assignee_email
        ? { id: row.assignee_id, name: row.assignee_name, email: row.assignee_email }
        : null,
    dueDate: row.due_date,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const TASK_SELECT = `
  SELECT t.id, t.board_id, t.title, t.description, t.status, t.assignee_id, t.due_date,
         t.position, t.created_at, t.updated_at,
         u.name AS assignee_name, u.email AS assignee_email
  FROM tasks t
  LEFT JOIN users u ON u.id = t.assignee_id
`;

function listTasks(db: DB, boardId: string): Task[] {
  const rows = db
    .prepare(`${TASK_SELECT} WHERE t.board_id = ? ORDER BY t.status, t.position, t.created_at`)
    .all(boardId) as TaskJoinRow[];
  return rows.map(presentTask);
}

function getTaskView(db: DB, taskId: string): Task | undefined {
  const row = db.prepare(`${TASK_SELECT} WHERE t.id = ?`).get(taskId) as TaskJoinRow | undefined;
  return row ? presentTask(row) : undefined;
}

function presentBoard(row: BoardAccessRow, db: DB): BoardSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ownerId: row.owner_id,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    counts: countTasks(db, row.id),
    members: listMembers(db, row.id),
  };
}

export function listBoards(db: DB, userId: string): BoardSummary[] {
  const rows = db
    .prepare(
      `SELECT b.id, b.name, b.description, b.owner_id, b.created_at, b.updated_at, bm.role
       FROM boards b
       JOIN board_members bm ON bm.board_id = b.id
       WHERE bm.user_id = ?
       ORDER BY b.updated_at DESC, b.name COLLATE NOCASE`,
    )
    .all(userId) as BoardAccessRow[];
  return rows.map((row) => presentBoard(row, db));
}

export function getBoard(db: DB, boardId: string, userId: string): BoardDetail {
  const row = db
    .prepare(
      `SELECT b.id, b.name, b.description, b.owner_id, b.created_at, b.updated_at, bm.role
       FROM boards b
       JOIN board_members bm ON bm.board_id = b.id
       WHERE b.id = ? AND bm.user_id = ?`,
    )
    .get(boardId, userId) as BoardAccessRow | undefined;
  if (!row) throw new HttpError(404, 'Board not found');
  return { ...presentBoard(row, db), tasks: listTasks(db, boardId) };
}

export function createBoard(
  db: DB,
  userId: string,
  input: { name: string; description?: string },
): BoardDetail {
  const id = randomUUID();
  const stamp = now();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO boards (id, name, description, owner_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, input.name, input.description ?? '', userId, stamp, stamp);
    db.prepare(
      `INSERT INTO board_members (board_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)`,
    ).run(id, userId, stamp);
  });
  tx();
  return getBoard(db, id, userId);
}

export function updateBoard(
  db: DB,
  boardId: string,
  userId: string,
  input: { name?: string; description?: string },
): BoardDetail {
  const board = getBoard(db, boardId, userId);
  if (board.role !== 'owner') {
    throw new HttpError(403, 'Only the board owner can change its details');
  }
  const stamp = now();
  db.prepare(
    `UPDATE boards SET name = ?, description = ?, updated_at = ? WHERE id = ?`,
  ).run(input.name ?? board.name, input.description ?? board.description, stamp, boardId);
  return getBoard(db, boardId, userId);
}

export function deleteBoard(db: DB, boardId: string, userId: string) {
  const board = getBoard(db, boardId, userId);
  if (board.role !== 'owner') {
    throw new HttpError(403, 'Only the board owner can delete it');
  }
  db.prepare('DELETE FROM boards WHERE id = ?').run(boardId);
}

export function addMember(db: DB, boardId: string, actorId: string, email: string): Member {
  getBoard(db, boardId, actorId);
  const user = db
    .prepare('SELECT id, name, email FROM users WHERE email = ?')
    .get(email) as PublicUser | undefined;
  if (!user) {
    throw new HttpError(404, 'No account with that email. They need to register first.');
  }
  const existing = db
    .prepare('SELECT 1 AS ok FROM board_members WHERE board_id = ? AND user_id = ?')
    .get(boardId, user.id);
  if (existing) throw new HttpError(409, 'That person is already on this board');
  const stamp = now();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO board_members (board_id, user_id, role, created_at) VALUES (?, ?, 'member', ?)`,
    ).run(boardId, user.id, stamp);
    touchBoard(db, boardId, stamp);
  });
  tx();
  return { ...user, role: 'member' };
}

export function removeMember(db: DB, boardId: string, actorId: string, memberId: string) {
  const board = getBoard(db, boardId, actorId);
  const target = board.members.find((member) => member.id === memberId);
  if (!target) throw new HttpError(404, 'That person is not on this board');
  if (target.role === 'owner') {
    throw new HttpError(400, 'The owner stays with the board');
  }
  const removingSelf = actorId === memberId;
  if (!removingSelf && board.role !== 'owner') {
    throw new HttpError(403, 'Only the board owner can remove someone');
  }
  const stamp = now();
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE tasks SET assignee_id = NULL, updated_at = ? WHERE board_id = ? AND assignee_id = ?`,
    ).run(stamp, boardId, memberId);
    db.prepare('DELETE FROM board_members WHERE board_id = ? AND user_id = ?').run(boardId, memberId);
    touchBoard(db, boardId, stamp);
  });
  tx();
}

function assertAssignee(db: DB, boardId: string, assigneeId: string | null) {
  if (assigneeId === null) return;
  const member = db
    .prepare('SELECT 1 AS ok FROM board_members WHERE board_id = ? AND user_id = ?')
    .get(boardId, assigneeId);
  if (!member) throw new HttpError(400, 'Assignee must be a member of this board');
}

type TaskWrite = {
  title: string;
  description: string;
  status: Status;
  assigneeId: string | null;
  dueDate: string | null;
  position: number;
};

function placeTask(db: DB, boardId: string, taskId: string, next: TaskWrite) {
  const rows = db
    .prepare('SELECT id, status, position FROM tasks WHERE board_id = ?')
    .all(boardId) as { id: string; status: Status; position: number }[];
  const grouped: Record<Status, { id: string }[]> = { todo: [], doing: [], done: [] };
  for (const status of STATUSES) {
    grouped[status] = rows
      .filter((row) => row.status === status && row.id !== taskId)
      .sort((a, b) => a.position - b.position)
      .map((row) => ({ id: row.id }));
  }
  const dest = grouped[next.status];
  const index = Math.max(0, Math.min(next.position, dest.length));
  dest.splice(index, 0, { id: taskId });
  const stamp = now();
  const updateMoved = db.prepare(
    `UPDATE tasks
     SET title = ?, description = ?, status = ?, assignee_id = ?, due_date = ?, position = ?, updated_at = ?
     WHERE id = ?`,
  );
  const updatePosition = db.prepare('UPDATE tasks SET status = ?, position = ? WHERE id = ?');
  const tx = db.transaction(() => {
    for (const status of STATUSES) {
      grouped[status].forEach((row, position) => {
        if (row.id === taskId) {
          updateMoved.run(
            next.title,
            next.description,
            status,
            next.assigneeId,
            next.dueDate,
            position,
            stamp,
            taskId,
          );
        } else {
          updatePosition.run(status, position, row.id);
        }
      });
    }
    touchBoard(db, boardId, stamp);
  });
  tx();
}

export function createTask(
  db: DB,
  boardId: string,
  userId: string,
  input: {
    title: string;
    description?: string;
    status?: Status;
    assigneeId?: string | null;
    dueDate?: string | null;
  },
): Task {
  getBoard(db, boardId, userId);
  const status = input.status ?? 'todo';
  const assigneeId = input.assigneeId ?? null;
  assertAssignee(db, boardId, assigneeId);
  const id = randomUUID();
  const stamp = now();
  const tx = db.transaction(() => {
    const row = db
      .prepare(
        'SELECT COALESCE(MAX(position), -1) AS maxPos FROM tasks WHERE board_id = ? AND status = ?',
      )
      .get(boardId, status) as { maxPos: number };
    db.prepare(
      `INSERT INTO tasks (
         id, board_id, title, description, status, assignee_id, due_date, position, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      boardId,
      input.title,
      input.description ?? '',
      status,
      assigneeId,
      input.dueDate ?? null,
      row.maxPos + 1,
      stamp,
      stamp,
    );
    touchBoard(db, boardId, stamp);
  });
  tx();
  const task = getTaskView(db, id);
  if (!task) throw new HttpError(500, 'Something went wrong');
  return task;
}

export function getTaskForUser(db: DB, taskId: string, userId: string): Task {
  const task = getTaskView(db, taskId);
  if (!task) throw new HttpError(404, 'Task not found');
  getBoard(db, task.boardId, userId);
  return task;
}

export function updateTask(
  db: DB,
  taskId: string,
  userId: string,
  input: {
    title?: string;
    description?: string;
    status?: Status;
    assigneeId?: string | null;
    dueDate?: string | null;
    position?: number;
  },
): Task {
  const existing = getTaskForUser(db, taskId, userId);
  const status = input.status ?? existing.status;
  const assigneeId =
    status === 'done' ? null : input.assigneeId === undefined ? existing.assigneeId : input.assigneeId;
  assertAssignee(db, existing.boardId, assigneeId);
  const position =
    input.position ?? (status === existing.status ? existing.position : Number.MAX_SAFE_INTEGER);
  placeTask(db, existing.boardId, taskId, {
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    status,
    assigneeId,
    dueDate: input.dueDate === undefined ? existing.dueDate : input.dueDate,
    position,
  });
  const task = getTaskView(db, taskId);
  if (!task) throw new HttpError(500, 'Something went wrong');
  return task;
}

export function deleteTask(db: DB, taskId: string, userId: string) {
  const existing = getTaskForUser(db, taskId, userId);
  const stamp = now();
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
    const remaining = db
      .prepare(
        'SELECT id FROM tasks WHERE board_id = ? AND status = ? ORDER BY position, created_at',
      )
      .all(existing.boardId, existing.status) as { id: string }[];
    const update = db.prepare('UPDATE tasks SET position = ? WHERE id = ?');
    remaining.forEach((row, position) => update.run(position, row.id));
    touchBoard(db, existing.boardId, stamp);
  });
  tx();
}
