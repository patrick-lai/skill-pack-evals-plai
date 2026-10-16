import { afterEach, expect, test } from 'vitest';
import { createApp, type QuayApp } from './app';

let app: QuayApp | null = null;

afterEach(async () => {
  if (app) {
    await app.close();
    app = null;
  }
});

async function start() {
  app = createApp({ filename: ':memory:' });
  return app.listen(0);
}

function cookieFrom(res: Response): string {
  const setCookie = res.headers.getSetCookie()[0] ?? res.headers.get('set-cookie') ?? '';
  expect(setCookie).toContain('HttpOnly');
  expect(setCookie).toContain('quay_session=');
  return setCookie.split(';')[0] ?? '';
}

async function call(base: string, method: string, path: string, cookie?: string, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, res };
}

async function register(base: string, email: string, password = 'correct-horse') {
  const result = await call(base, 'POST', '/api/auth/register', undefined, { email, password });
  return { ...result, cookie: result.status === 201 ? cookieFrom(result.res) : '' };
}

test('a person can join and stay signed in', async () => {
  const base = await start();
  const created = await register(base, 'Ada@Quay.test');
  expect(created.status).toBe(201);
  expect(Object.keys(created.body.member).sort()).toEqual(['email', 'id']);
  expect(created.body.member.email).toBe('ada@quay.test');

  const me = await call(base, 'GET', '/api/auth/me', created.cookie);
  expect(me.status).toBe(200);
  expect(me.body.member).toEqual(created.body.member);

  const signedOut = await call(base, 'POST', '/api/auth/logout', created.cookie);
  expect(signedOut.status).toBe(200);
  const after = await call(base, 'GET', '/api/auth/me', cookieFrom(signedOut.res));
  expect(after.status).toBe(401);
  expect(after.body).toEqual({ error: 'Sign in required' });
});

test('sign-in rejects a short password, a duplicate email, and a wrong password the same way', async () => {
  const base = await start();
  const missing = await call(base, 'POST', '/api/auth/register', undefined, {});
  expect(missing.status).toBe(400);
  expect(missing.body).toEqual({ error: 'Email and password are required' });

  const invalid = await call(base, 'POST', '/api/auth/register', undefined, {
    email: 'not-an-email',
    password: 'correct-horse',
  });
  expect(invalid.body).toEqual({ error: 'Enter a valid email' });

  const short = await call(base, 'POST', '/api/auth/register', undefined, {
    email: 'ada@quay.test',
    password: 'short',
  });
  expect(short.status).toBe(400);
  expect(short.body).toEqual({ error: 'Password must be at least 8 characters' });

  await register(base, 'ada@quay.test');
  const duplicate = await register(base, 'ada@quay.test');
  expect(duplicate.status).toBe(409);
  expect(duplicate.body).toEqual({ error: 'A member with that email already exists' });

  const unknown = await call(base, 'POST', '/api/auth/login', undefined, {
    email: 'missing@quay.test',
    password: 'correct-horse',
  });
  const wrong = await call(base, 'POST', '/api/auth/login', undefined, {
    email: 'ada@quay.test',
    password: 'wrong-password',
  });
  expect(unknown.status).toBe(401);
  expect(wrong.status).toBe(401);
  expect(unknown.body).toEqual({ error: 'Email or password is incorrect' });
  expect(wrong.body).toEqual(unknown.body);
});

test('a signed-out person cannot read or change boards', async () => {
  const base = await start();
  for (const [method, path, body] of [
    ['GET', '/api/boards', undefined],
    ['POST', '/api/boards', { name: 'Launch' }],
    ['GET', '/api/auth/me', undefined],
  ] as const) {
    const result = await call(base, method, path, undefined, body);
    expect(result.status).toBe(401);
    expect(result.body).toEqual({ error: 'Sign in required' });
  }
});

test('members of the team share boards', async () => {
  const base = await start();
  const ada = await register(base, 'ada@quay.test');
  const created = await call(base, 'POST', '/api/boards', ada.cookie, { name: '  Launch plan  ' });
  expect(created.status).toBe(201);
  expect(created.body.board).toMatchObject({ name: 'Launch plan', taskCount: 0 });

  const grace = await register(base, 'grace@quay.test');
  const listed = await call(base, 'GET', '/api/boards', grace.cookie);
  expect(listed.status).toBe(200);
  expect(listed.body.boards).toEqual([created.body.board]);

  const renamed = await call(base, 'PATCH', `/api/boards/${created.body.board.id}`, grace.cookie, {
    name: 'Launch',
  });
  expect(renamed.body.board.name).toBe('Launch');

  const blank = await call(base, 'POST', '/api/boards', ada.cookie, { name: '   ' });
  expect(blank.status).toBe(400);
  expect(blank.body).toEqual({ error: 'Board name is required' });
});

test('a member can add a task and see it on the board in column order', async () => {
  const base = await start();
  const ada = await register(base, 'ada@quay.test');
  const grace = await register(base, 'grace@quay.test');
  const board = await call(base, 'POST', '/api/boards', ada.cookie, { name: 'Launch' });
  const boardId = board.body.board.id as string;

  const missing = await call(base, 'POST', `/api/boards/${boardId}/tasks`, ada.cookie, { title: '  ' });
  expect(missing.status).toBe(400);
  expect(missing.body).toEqual({ error: 'Task title is required' });

  const badAssignee = await call(base, 'POST', `/api/boards/${boardId}/tasks`, ada.cookie, {
    title: 'Write the brief',
    assigneeId: 'not-a-member',
  });
  expect(badAssignee.status).toBe(400);
  expect(badAssignee.body).toEqual({ error: 'Assignee is not a member' });

  const badDate = await call(base, 'POST', `/api/boards/${boardId}/tasks`, ada.cookie, {
    title: 'Write the brief',
    dueDate: '2026-02-31',
  });
  expect(badDate.body).toEqual({ error: 'Due date must be YYYY-MM-DD' });

  const first = await call(base, 'POST', `/api/boards/${boardId}/tasks`, ada.cookie, {
    title: ' Write the brief ',
    description: 'One page, no slides.',
    assigneeId: grace.body.member.id,
    dueDate: '2026-12-01',
  });
  expect(first.status).toBe(201);
  expect(first.body.task).toMatchObject({
    title: 'Write the brief',
    description: 'One page, no slides.',
    status: 'todo',
    assigneeId: grace.body.member.id,
    dueDate: '2026-12-01',
    position: 1,
  });

  const second = await call(base, 'POST', `/api/boards/${boardId}/tasks`, ada.cookie, {
    title: 'Book the room',
    status: 'doing',
  });
  expect(second.body.task).toMatchObject({ status: 'doing', description: '', assigneeId: null, dueDate: null });

  const seen = await call(base, 'GET', `/api/boards/${boardId}`, grace.cookie);
  expect(seen.body.tasks.map((task: { title: string }) => task.title)).toEqual(['Write the brief', 'Book the room']);
  expect(seen.body.members.map((member: { email: string }) => member.email)).toEqual([
    'ada@quay.test',
    'grace@quay.test',
  ]);
  expect(seen.body.board).toEqual({ id: boardId, name: 'Launch' });

  const listed = await call(base, 'GET', '/api/boards', ada.cookie);
  expect(listed.body.boards[0].taskCount).toBe(2);
});

test('a member can move, edit, clear, and delete a task, and delete a board', async () => {
  const base = await start();
  const ada = await register(base, 'ada@quay.test');
  const board = await call(base, 'POST', '/api/boards', ada.cookie, { name: 'Launch' });
  const boardId = board.body.board.id as string;
  const created = await call(base, 'POST', `/api/boards/${boardId}/tasks`, ada.cookie, {
    title: 'Write the brief',
    description: 'Keep this',
    dueDate: '2026-12-01',
    assigneeId: ada.body.member.id,
  });
  const taskId = created.body.task.id as string;

  const badStatus = await call(base, 'PATCH', `/api/tasks/${taskId}`, ada.cookie, { status: 'archived' });
  expect(badStatus.status).toBe(400);
  expect(badStatus.body).toEqual({ error: 'Status must be todo, doing, or done' });

  const moved = await call(base, 'PATCH', `/api/tasks/${taskId}`, ada.cookie, { status: 'done' });
  expect(moved.status).toBe(200);
  expect(moved.body.task.status).toBe('done');
  expect(moved.body.task.description).toBe('Keep this');
  expect(moved.body.task.dueDate).toBe('2026-12-01');

  const cleared = await call(base, 'PATCH', `/api/tasks/${taskId}`, ada.cookie, {
    title: 'Send the brief',
    assigneeId: null,
    dueDate: null,
  });
  expect(cleared.body.task).toMatchObject({
    title: 'Send the brief',
    status: 'done',
    assigneeId: null,
    dueDate: null,
    description: 'Keep this',
  });

  const removed = await call(base, 'DELETE', `/api/tasks/${taskId}`, ada.cookie);
  expect(removed.status).toBe(200);
  const afterTask = await call(base, 'GET', `/api/boards/${boardId}`, ada.cookie);
  expect(afterTask.body.tasks).toEqual([]);

  const missing = await call(base, 'DELETE', `/api/tasks/${taskId}`, ada.cookie);
  expect(missing.status).toBe(404);
  expect(missing.body).toEqual({ error: 'Task not found' });

  const deletedBoard = await call(base, 'DELETE', `/api/boards/${boardId}`, ada.cookie);
  expect(deletedBoard.status).toBe(200);
  const gone = await call(base, 'GET', `/api/boards/${boardId}`, ada.cookie);
  expect(gone.status).toBe(404);
  expect(gone.body).toEqual({ error: 'Board not found' });
  const listed = await call(base, 'GET', '/api/boards', ada.cookie);
  expect(listed.body.boards).toEqual([]);
});
