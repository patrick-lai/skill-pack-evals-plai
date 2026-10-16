import { DatabaseSync } from "node:sqlite";
import {
  BoardSchema,
  PublicUserSchema,
  TaskSchema,
  newId,
  BoardIdSchema,
  TaskIdSchema,
  UserIdSchema,
} from "@plank/shared";
import type { Board, BoardId, PublicUser, Task, TaskId, TaskStatus, UserId } from "@plank/shared";

export type Database = DatabaseSync;

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
};

export function openDatabase(path: string): Database {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA locking_mode = EXCLUSIVE");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS memberships (
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (board_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('todo', 'doing', 'done')),
      assignee_id TEXT REFERENCES users(id),
      due_date TEXT,
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS memberships_user ON memberships(user_id);
    CREATE INDEX IF NOT EXISTS tasks_board ON tasks(board_id, status, position);
  `);
  return db;
}

export function transaction<T>(db: Database, run: () => T): T {
  db.exec("BEGIN");
  try {
    const result = run();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function isUniqueConstraint(error: unknown): boolean {
  return error instanceof Error && error.message.includes("UNIQUE");
}

function publicUser(row: { id: string; email: string; name: string }): PublicUser {
  return PublicUserSchema.parse(row);
}

export function insertUser(
  db: Database,
  input: { email: string; name: string; passwordHash: string },
): PublicUser {
  const id = newId(UserIdSchema);
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(id, input.email, input.name, input.passwordHash, createdAt);
  return publicUser({ id, email: input.email, name: input.name });
}

export function findUserByEmail(db: Database, email: string): (PublicUser & { passwordHash: string }) | null {
  const row = db.prepare("SELECT id, email, name, password_hash FROM users WHERE email = ?").get(email) as
    | UserRow
    | undefined;
  if (!row) return null;
  return { ...publicUser(row), passwordHash: row.password_hash };
}

export function findUserById(db: Database, id: UserId): PublicUser | null {
  const row = db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(id) as
    | Omit<UserRow, "password_hash">
    | undefined;
  return row ? publicUser(row) : null;
}

export function createSession(db: Database, userId: UserId): string {
  const token = crypto.randomUUID() + crypto.randomUUID();
  db.prepare("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)").run(
    token,
    userId,
    new Date().toISOString(),
  );
  return token;
}

export function deleteSession(db: Database, token: string): void {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function findUserBySession(db: Database, token: string): PublicUser | null {
  const row = db
    .prepare(
      `SELECT users.id, users.email, users.name
       FROM sessions JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ?`,
    )
    .get(token) as Omit<UserRow, "password_hash"> | undefined;
  return row ? publicUser(row) : null;
}

export function insertBoard(db: Database, ownerId: UserId, name: string): Board {
  const id = newId(BoardIdSchema);
  const createdAt = new Date().toISOString();
  transaction(db, () => {
    db.prepare("INSERT INTO boards (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)").run(
      id,
      name,
      ownerId,
      createdAt,
    );
    db.prepare("INSERT INTO memberships (board_id, user_id) VALUES (?, ?)").run(id, ownerId);
  });
  return BoardSchema.parse({ id, name, ownerId });
}

export function listBoards(db: Database, userId: UserId): Board[] {
  const rows = db
    .prepare(
      `SELECT boards.id, boards.name, boards.owner_id AS ownerId
       FROM boards JOIN memberships ON memberships.board_id = boards.id
       WHERE memberships.user_id = ?
       ORDER BY boards.created_at ASC`,
    )
    .all(userId) as { id: string; name: string; ownerId: string }[];
  return rows.map((row) => BoardSchema.parse(row));
}

export function findBoard(db: Database, boardId: BoardId): Board | null {
  const row = db.prepare("SELECT id, name, owner_id AS ownerId FROM boards WHERE id = ?").get(boardId) as
    | { id: string; name: string; ownerId: string }
    | undefined;
  return row ? BoardSchema.parse(row) : null;
}

export function isMember(db: Database, boardId: BoardId, userId: UserId): boolean {
  const row = db
    .prepare("SELECT 1 AS ok FROM memberships WHERE board_id = ? AND user_id = ?")
    .get(boardId, userId) as { ok: number } | undefined;
  return row != null;
}

export function listMembers(db: Database, boardId: BoardId): PublicUser[] {
  const rows = db
    .prepare(
      `SELECT users.id, users.email, users.name
       FROM users JOIN memberships ON memberships.user_id = users.id
       WHERE memberships.board_id = ?
       ORDER BY users.name COLLATE NOCASE ASC`,
    )
    .all(boardId) as { id: string; email: string; name: string }[];
  return rows.map(publicUser);
}

export function addMember(db: Database, boardId: BoardId, userId: UserId): void {
  db.prepare("INSERT OR IGNORE INTO memberships (board_id, user_id) VALUES (?, ?)").run(boardId, userId);
}

export function deleteBoard(db: Database, boardId: BoardId): void {
  db.prepare("DELETE FROM boards WHERE id = ?").run(boardId);
}

function taskFromRow(row: {
  id: string;
  boardId: string;
  title: string;
  description: string;
  status: string;
  assigneeId: string | null;
  dueDate: string | null;
  position: number;
}): Task {
  return TaskSchema.parse(row);
}

const taskSelect = `SELECT id, board_id AS boardId, title, description, status,
  assignee_id AS assigneeId, due_date AS dueDate, position FROM tasks`;

export function listTasks(db: Database, boardId: BoardId): Task[] {
  const rows = db
    .prepare(`${taskSelect} WHERE board_id = ? ORDER BY status, position, id`)
    .all(boardId) as Parameters<typeof taskFromRow>[0][];
  return rows.map(taskFromRow);
}

export function findTask(db: Database, taskId: TaskId): Task | null {
  const row = db.prepare(`${taskSelect} WHERE id = ?`).get(taskId) as
    | Parameters<typeof taskFromRow>[0]
    | undefined;
  return row ? taskFromRow(row) : null;
}

export function insertTask(
  db: Database,
  boardId: BoardId,
  input: {
    title: string;
    description: string;
    status: TaskStatus;
    assigneeId: UserId | null;
    dueDate: string | null;
  },
): Task {
  const id = newId(TaskIdSchema);
  const positionRow = db
    .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS next FROM tasks WHERE board_id = ? AND status = ?")
    .get(boardId, input.status) as { next: number };
  const task = taskFromRow({
    id,
    boardId,
    title: input.title,
    description: input.description,
    status: input.status,
    assigneeId: input.assigneeId,
    dueDate: input.dueDate,
    position: positionRow.next,
  });
  db.prepare(
    `INSERT INTO tasks
      (id, board_id, title, description, status, assignee_id, due_date, position, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    task.id,
    task.boardId,
    task.title,
    task.description,
    task.status,
    task.assigneeId,
    task.dueDate,
    task.position,
    new Date().toISOString(),
  );
  return task;
}

export function updateTask(
  db: Database,
  taskId: TaskId,
  input: { title: string; description: string; assigneeId: UserId | null; dueDate: string | null },
): void {
  db.prepare(
    "UPDATE tasks SET title = ?, description = ?, assignee_id = ?, due_date = ? WHERE id = ?",
  ).run(input.title, input.description, input.assigneeId, input.dueDate, taskId);
}

export function saveColumn(db: Database, tasks: readonly Task[], status: TaskStatus): void {
  const update = db.prepare("UPDATE tasks SET status = ?, position = ? WHERE id = ?");
  transaction(db, () => {
    for (const task of tasks) {
      if (task.status !== status) continue;
      update.run(task.status, task.position, task.id);
    }
  });
}

export function deleteTask(db: Database, taskId: TaskId): void {
  db.prepare("DELETE FROM tasks WHERE id = ?").run(taskId);
}
