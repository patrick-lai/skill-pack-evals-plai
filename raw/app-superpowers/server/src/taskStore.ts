import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { Task, TaskStatus } from '@boardline/shared';

type TaskRow = {
  id: string;
  board_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee_id: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    description: row.description,
    status: row.status,
    assigneeId: row.assignee_id,
    dueDate: row.due_date,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listTasks(db: Database.Database, boardId: string): Task[] {
  const rows = db
    .prepare(
      `SELECT * FROM tasks
       WHERE board_id = ?
       ORDER BY CASE status WHEN 'todo' THEN 0 WHEN 'doing' THEN 1 ELSE 2 END, position ASC`,
    )
    .all(boardId) as TaskRow[];
  return rows.map(mapTask);
}

export function isBoardMember(db: Database.Database, boardId: string, userId: string): boolean {
  return Boolean(
    db.prepare(`SELECT 1 AS ok FROM board_members WHERE board_id = ? AND user_id = ?`).get(boardId, userId),
  );
}

export function getTaskForUser(db: Database.Database, taskId: string, userId: string): TaskRow | undefined {
  return db
    .prepare(
      `SELECT t.*
       FROM tasks t
       JOIN board_members bm ON bm.board_id = t.board_id AND bm.user_id = ?
       WHERE t.id = ?`,
    )
    .get(userId, taskId) as TaskRow | undefined;
}

export function createTask(
  db: Database.Database,
  input: {
    boardId: string;
    title: string;
    description: string;
    status: TaskStatus;
    assigneeId: string | null;
    dueDate: string | null;
  },
): Task {
  const now = new Date().toISOString();
  const position = (
    db
      .prepare(
        `SELECT COALESCE(MAX(position), -1) + 1 AS position
         FROM tasks WHERE board_id = ? AND status = ?`,
      )
      .get(input.boardId, input.status) as { position: number }
  ).position;
  const row: TaskRow = {
    id: randomUUID(),
    board_id: input.boardId,
    title: input.title,
    description: input.description,
    status: input.status,
    assignee_id: input.assigneeId,
    due_date: input.dueDate,
    position,
    created_at: now,
    updated_at: now,
  };
  db.prepare(
    `INSERT INTO tasks (
      id, board_id, title, description, status, assignee_id, due_date, position, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    row.id,
    row.board_id,
    row.title,
    row.description,
    row.status,
    row.assignee_id,
    row.due_date,
    row.position,
    row.created_at,
    row.updated_at,
  );
  return mapTask(row);
}

export function placeTask(db: Database.Database, taskId: string, toStatus: TaskStatus, toIndex: number | null): void {
  const current = db.prepare(`SELECT board_id, status FROM tasks WHERE id = ?`).get(taskId) as {
    board_id: string;
    status: TaskStatus;
  };
  const run = db.transaction(() => {
    db.prepare(`UPDATE tasks SET status = ?, position = -1000000 WHERE id = ?`).run(toStatus, taskId);
    if (current.status !== toStatus) reindex(db, current.board_id, current.status);
    const rows = db
      .prepare(
        `SELECT id FROM tasks WHERE board_id = ? AND status = ? AND id != ? ORDER BY position ASC`,
      )
      .all(current.board_id, toStatus, taskId) as Array<{ id: string }>;
    const index = toIndex == null ? rows.length : Math.max(0, Math.min(toIndex, rows.length));
    const order = rows.map((row) => row.id);
    order.splice(index, 0, taskId);
    writePositions(db, order);
  });
  run();
}

export function deleteTask(db: Database.Database, task: TaskRow): void {
  const run = db.transaction(() => {
    db.prepare(`DELETE FROM tasks WHERE id = ?`).run(task.id);
    reindex(db, task.board_id, task.status);
  });
  run();
}

export function saveTaskFields(
  db: Database.Database,
  taskId: string,
  fields: { title: string; description: string; assigneeId: string | null; dueDate: string | null },
): Task {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE tasks SET title = ?, description = ?, assignee_id = ?, due_date = ?, updated_at = ? WHERE id = ?`,
  ).run(fields.title, fields.description, fields.assigneeId, fields.dueDate, now, taskId);
  return mapTask(db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(taskId) as TaskRow);
}

function reindex(db: Database.Database, boardId: string, status: TaskStatus): void {
  const rows = db
    .prepare(`SELECT id FROM tasks WHERE board_id = ? AND status = ? ORDER BY position ASC, id ASC`)
    .all(boardId, status) as Array<{ id: string }>;
  writePositions(
    db,
    rows.map((row) => row.id),
  );
}

function writePositions(db: Database.Database, ids: string[]): void {
  const setPosition = db.prepare(`UPDATE tasks SET position = ? WHERE id = ?`);
  ids.forEach((id, index) => setPosition.run(-1 - index, id));
  ids.forEach((id, index) => setPosition.run(index, id));
}
