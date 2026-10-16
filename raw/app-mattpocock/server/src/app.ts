import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const STATUSES = ['todo', 'doing', 'done'] as const;
type Status = (typeof STATUSES)[number];

const SCRYPT = { N: 16384, r: 8, p: 1 } as const;
const SESSION_SECONDS = 14 * 24 * 60 * 60;
const MAX_BODY = 100_000;

type Member = { id: string; email: string };

type TaskRow = {
  id: string;
  board_id: string;
  title: string;
  description: string;
  status: Status;
  assignee_id: string | null;
  due_date: string | null;
  position: number;
};

export type QuayApp = {
  listen(port: number, host?: string): Promise<string>;
  close(): Promise<void>;
};

export type CreateAppOptions = {
  filename: string;
};

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function createApp(options: CreateAppOptions): QuayApp {
  if (options.filename !== ':memory:') {
    mkdirSync(dirname(options.filename), { recursive: true });
  }
  const db = new DatabaseSync(options.filename);
  db.exec('PRAGMA foreign_keys = ON');
  migrate(db);
  const dummyHash = hashPassword('not-a-real-password-value');

  const server = createServer(async (req, res) => {
    try {
      await handle(db, dummyHash, req, res);
    } catch (err) {
      if (err instanceof HttpError) {
        send(res, err.status, { error: err.message });
        return;
      }
      console.error(err);
      send(res, 500, { error: 'Something went wrong' });
    }
  });

  return {
    listen(port, host = '127.0.0.1') {
      return new Promise((resolve, reject) => {
        const onError = (err: Error) => reject(err);
        server.once('error', onError);
        server.listen(port, host, () => {
          server.off('error', onError);
          const addr = server.address();
          if (!addr || typeof addr === 'string') {
            reject(new Error('Expected a TCP port'));
            return;
          }
          const advertised = host === '0.0.0.0' ? '127.0.0.1' : host;
          resolve(`http://${advertised}:${addr.port}`);
        });
      });
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close((err) => {
          try {
            db.close();
          } catch {
            // The database may already be closed if listen never succeeded.
          }
          if (err) reject(err);
          else resolve();
        });
      });
    },
  };
}

function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('todo', 'doing', 'done')),
      assignee_id TEXT REFERENCES members(id),
      due_date TEXT,
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS tasks_board_status_idx ON tasks(board_id, status, position);
  `);
}

async function handle(db: DatabaseSync, dummyHash: string, req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const method = req.method ?? 'GET';
  const member = memberFromRequest(db, req);

  if (method === 'POST' && pathname === '/api/auth/register') {
    const body = await readJson(req);
    const { email, password } = requireCredentials(body);
    const existing = db.prepare('SELECT id FROM members WHERE email = ?').get(email);
    if (existing) throw new HttpError(409, 'A member with that email already exists');
    const created: Member = { id: randomUUID(), email };
    db.prepare('INSERT INTO members (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
      created.id,
      created.email,
      hashPassword(password),
      now(),
    );
    const token = openSession(db, created.id);
    send(res, 201, { member: created }, { 'Set-Cookie': sessionCookie(token, SESSION_SECONDS) });
    return;
  }

  if (method === 'POST' && pathname === '/api/auth/login') {
    const body = await readJson(req);
    const { email, password } = requireCredentials(body);
    const row = db.prepare('SELECT id, email, password_hash FROM members WHERE email = ?').get(email) as
      | { id: string; email: string; password_hash: string }
      | undefined;
    const matches = verifyPassword(password, row?.password_hash ?? dummyHash);
    if (!row || !matches) throw new HttpError(401, 'Email or password is incorrect');
    const token = openSession(db, row.id);
    send(res, 200, { member: { id: row.id, email: row.email } }, { 'Set-Cookie': sessionCookie(token, SESSION_SECONDS) });
    return;
  }

  if (method === 'POST' && pathname === '/api/auth/logout') {
    const token = readCookie(req, 'quay_session');
    if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
    send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) });
    return;
  }

  if (method === 'GET' && pathname === '/api/auth/me') {
    const current = requireMember(member);
    send(res, 200, { member: current });
    return;
  }

  if (method === 'GET' && pathname === '/api/boards') {
    requireMember(member);
    const rows = db
      .prepare(
        `SELECT b.id, b.name,
                (SELECT COUNT(*) FROM tasks t WHERE t.board_id = b.id) AS task_count
         FROM boards b
         ORDER BY b.created_at ASC`,
      )
      .all() as { id: string; name: string; task_count: number }[];
    send(res, 200, { boards: rows.map(toBoardSummary) });
    return;
  }

  if (method === 'POST' && pathname === '/api/boards') {
    requireMember(member);
    const body = await readJson(req);
    const name = requireBoardName(body.name);
    const id = randomUUID();
    const createdAt = now();
    db.prepare('INSERT INTO boards (id, name, created_at) VALUES (?, ?, ?)').run(id, name, createdAt);
    send(res, 201, { board: { id, name, taskCount: 0 } });
    return;
  }

  const boardTask = pathname.match(/^\/api\/boards\/([^/]+)\/tasks$/);
  if (boardTask) {
    requireMember(member);
    const boardId = boardTask[1];
    if (method === 'POST') {
      requireBoard(db, boardId);
      const body = await readJson(req);
      const title = requireTitle(body.title);
      const description = optionalDescription(body.description, '');
      const status = parseStatus(body.status, 'todo');
      const assigneeId = parseAssignee(body.assigneeId, null);
      assertAssignee(db, assigneeId);
      const dueDate = parseDueDate(body.dueDate, null);
      const id = randomUUID();
      const position = nextPosition(db, boardId, status);
      db.prepare(
        `INSERT INTO tasks
           (id, board_id, title, description, status, assignee_id, due_date, position, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, boardId, title, description, status, assigneeId, dueDate, position, now());
      send(res, 201, { task: mustTask(db, id) });
      return;
    }
  }

  const boardPath = pathname.match(/^\/api\/boards\/([^/]+)$/);
  if (boardPath) {
    requireMember(member);
    const boardId = boardPath[1];
    if (method === 'GET') {
      const board = requireBoard(db, boardId);
      const tasks = (
        db.prepare('SELECT * FROM tasks WHERE board_id = ? ORDER BY position ASC, created_at ASC').all(boardId) as TaskRow[]
      ).map(toTask);
      const members = db.prepare('SELECT id, email FROM members ORDER BY email ASC').all() as Member[];
      send(res, 200, { board, tasks, members });
      return;
    }
    if (method === 'PATCH') {
      requireBoard(db, boardId);
      const body = await readJson(req);
      const name = requireBoardName(body.name);
      db.prepare('UPDATE boards SET name = ? WHERE id = ?').run(name, boardId);
      const taskCount = db.prepare('SELECT COUNT(*) AS task_count FROM tasks WHERE board_id = ?').get(boardId) as {
        task_count: number;
      };
      send(res, 200, { board: { id: boardId, name, taskCount: Number(taskCount.task_count) } });
      return;
    }
    if (method === 'DELETE') {
      requireBoard(db, boardId);
      db.prepare('DELETE FROM boards WHERE id = ?').run(boardId);
      send(res, 200, { ok: true });
      return;
    }
  }

  const taskPath = pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskPath) {
    requireMember(member);
    const taskId = taskPath[1];
    if (method === 'PATCH') {
      const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as TaskRow | undefined;
      if (!existing) throw new HttpError(404, 'Task not found');
      const body = await readJson(req);
      const title = 'title' in body ? requireTitle(body.title) : existing.title;
      const description = 'description' in body ? optionalDescription(body.description, existing.description) : existing.description;
      const status = 'status' in body ? parseStatus(body.status, existing.status) : existing.status;
      const assigneeId = 'assigneeId' in body ? parseAssignee(body.assigneeId, existing.assignee_id) : existing.assignee_id;
      assertAssignee(db, assigneeId);
      const dueDate = 'dueDate' in body ? parseDueDate(body.dueDate, existing.due_date) : existing.due_date;
      const position = status === existing.status ? existing.position : nextPosition(db, existing.board_id, status);
      db.prepare(
        `UPDATE tasks
         SET title = ?, description = ?, status = ?, assignee_id = ?, due_date = ?, position = ?
         WHERE id = ?`,
      ).run(title, description, status, assigneeId, dueDate, position, taskId);
      send(res, 200, { task: mustTask(db, taskId) });
      return;
    }
    if (method === 'DELETE') {
      const existing = db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId);
      if (!existing) throw new HttpError(404, 'Task not found');
      db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
      send(res, 200, { ok: true });
      return;
    }
  }

  if (pathname.startsWith('/api/')) {
    throw new HttpError(404, 'Not found');
  }
  throw new HttpError(404, 'Not found');
}

function requireBoard(db: DatabaseSync, boardId: string): { id: string; name: string } {
  const board = db.prepare('SELECT id, name FROM boards WHERE id = ?').get(boardId) as
    | { id: string; name: string }
    | undefined;
  if (!board) throw new HttpError(404, 'Board not found');
  return board;
}

function requireMember(member: Member | null): Member {
  if (!member) throw new HttpError(401, 'Sign in required');
  return member;
}

function memberFromRequest(db: DatabaseSync, req: IncomingMessage): Member | null {
  const token = readCookie(req, 'quay_session');
  if (!token) return null;
  const tokenHash = sha256(token);
  const row = db
    .prepare(
      `SELECT m.id, m.email, s.expires_at
       FROM sessions s
       JOIN members m ON m.id = s.member_id
       WHERE s.token_hash = ?`,
    )
    .get(tokenHash) as { id: string; email: string; expires_at: string } | undefined;
  if (!row) return null;
  if (row.expires_at <= now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    return null;
  }
  return { id: row.id, email: row.email };
}

function openSession(db: DatabaseSync, memberId: string): string {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token_hash, member_id, expires_at) VALUES (?, ?, ?)').run(sha256(token), memberId, expires);
  return token;
}

function requireCredentials(body: Record<string, unknown>): { email: string; password: string } {
  const email = body.email;
  const password = body.password;
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    throw new HttpError(400, 'Email and password are required');
  }
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254) {
    throw new HttpError(400, 'Enter a valid email');
  }
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  if (password.length > 200) throw new HttpError(400, 'Password is too long');
  return { email: normalized, password };
}

function requireBoardName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, 'Board name is required');
  const name = value.trim();
  if (name.length > 80) throw new HttpError(400, 'Board name is too long');
  return name;
}

function requireTitle(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, 'Task title is required');
  const title = value.trim();
  if (title.length > 200) throw new HttpError(400, 'Task title is too long');
  return title;
}

function optionalDescription(value: unknown, fallback: string): string {
  if (value === undefined) return fallback;
  if (typeof value !== 'string') throw new HttpError(400, 'Description must be text');
  if (value.length > 5000) throw new HttpError(400, 'Description is too long');
  return value;
}

function parseStatus(value: unknown, fallback: Status): Status {
  if (value === undefined) return fallback;
  if (value !== 'todo' && value !== 'doing' && value !== 'done') {
    throw new HttpError(400, 'Status must be todo, doing, or done');
  }
  return value;
}

function parseAssignee(value: unknown, fallback: string | null): string | null {
  if (value === undefined) return fallback;
  if (value === null) return null;
  if (typeof value !== 'string' || !value) throw new HttpError(400, 'Assignee is not a member');
  return value;
}

function assertAssignee(db: DatabaseSync, assigneeId: string | null) {
  if (assigneeId === null) return;
  const member = db.prepare('SELECT id FROM members WHERE id = ?').get(assigneeId);
  if (!member) throw new HttpError(400, 'Assignee is not a member');
}

function parseDueDate(value: unknown, fallback: string | null): string | null {
  if (value === undefined) return fallback;
  if (value === null) return null;
  if (typeof value !== 'string' || !isValidDueDate(value)) {
    throw new HttpError(400, 'Due date must be YYYY-MM-DD');
  }
  return value;
}

function isValidDueDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function nextPosition(db: DatabaseSync, boardId: string, status: Status): number {
  const row = db
    .prepare('SELECT COALESCE(MAX(position), 0) + 1 AS next FROM tasks WHERE board_id = ? AND status = ?')
    .get(boardId, status) as { next: number };
  return Number(row.next);
}

function mustTask(db: DatabaseSync, id: string) {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
  if (!row) throw new HttpError(404, 'Task not found');
  return toTask(row);
}

function toTask(row: TaskRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    assigneeId: row.assignee_id,
    dueDate: row.due_date,
    position: row.position,
  };
}

function toBoardSummary(row: { id: string; name: string; task_count: number }) {
  return { id: row.id, name: row.name, taskCount: Number(row.task_count) };
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > MAX_BODY) throw new HttpError(413, 'Request is too large');
    chunks.push(buf);
  }
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Request body must be JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new HttpError(400, 'Request body must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

function readCookie(req: IncomingMessage, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key !== name) continue;
    return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

function sessionCookie(token: string, maxAge: number): string {
  return `quay_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32, SCRYPT);
  return `scrypt:${salt.toString('base64')}:${hash.toString('base64')}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1] ?? '', 'base64');
  const expected = Buffer.from(parts[2] ?? '', 'base64');
  const actual = scryptSync(password, salt, expected.length, SCRYPT);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function now(): string {
  return new Date().toISOString();
}
