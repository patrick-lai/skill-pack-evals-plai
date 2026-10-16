import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeApp, createApp } from '../src/app.ts';
import { removeDatabaseFiles } from '../src/db.ts';

type TaskBody = {
  id: string;
  title: string;
  status: string;
  position: number;
  assigneeId: string | null;
  dueDate: string | null;
  description: string;
};

type BoardBody = {
  id: string;
  name: string;
  role: string;
  tasks: TaskBody[];
  counts: { todo: number; doing: number; done: number };
  members: { id: string; email: string; role: string }[];
};

let app: Express;
let dbPath: string;

beforeEach(() => {
  dbPath = path.join(os.tmpdir(), `quay-${randomUUID()}.sqlite`);
  app = createApp(dbPath);
});

afterEach(() => {
  closeApp(app);
  removeDatabaseFiles(dbPath);
  fs.rmSync(dbPath, { force: true });
});

describe('auth', () => {
  it('answers a health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('rejects a short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'short',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/);
  });

  it('registers, reads the session, and logs out', async () => {
    const agent = request.agent(app);
    const created = await agent.post('/api/auth/register').send({
      name: 'Ada Lovelace',
      email: 'Ada@Example.com',
      password: 'password123',
    });
    expect(created.status).toBe(201);
    expect(created.body.user).toEqual({
      id: expect.any(String),
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    });
    expect(created.body.user.password).toBeUndefined();
    expect(created.headers['set-cookie']?.[0]).toMatch(/quay_session=/);
    expect(created.headers['set-cookie']?.[0]).toMatch(/HttpOnly/i);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('ada@example.com');

    const loggedOut = await agent.post('/api/auth/logout');
    expect(loggedOut.status).toBe(204);
    const after = await agent.get('/api/auth/me');
    expect(after.status).toBe(401);
  });

  it('rejects a wrong password and accepts the right one', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Grace Hopper',
      email: 'grace@example.com',
      password: 'password123',
    });
    const wrong = await request(app).post('/api/auth/login').send({
      email: 'grace@example.com',
      password: 'not-the-password',
    });
    expect(wrong.status).toBe(401);

    const right = await request(app).post('/api/auth/login').send({
      email: 'GRACE@example.com',
      password: 'password123',
    });
    expect(right.status).toBe(200);
    expect(right.body.user.name).toBe('Grace Hopper');
  });

  it('rejects a duplicate email', async () => {
    const body = { name: 'Ada', email: 'ada@example.com', password: 'password123' };
    await request(app).post('/api/auth/register').send(body);
    const again = await request(app)
      .post('/api/auth/register')
      .send({ ...body, name: 'Ada Two' });
    expect(again.status).toBe(409);
  });

  it('requires a session for boards', async () => {
    const res = await request(app).get('/api/boards');
    expect(res.status).toBe(401);
  });
});

describe('boards and tasks', () => {
  async function register(email: string, name: string) {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/register').send({
      name,
      email,
      password: 'password123',
    });
    expect(res.status).toBe(201);
    return { agent, user: res.body.user as { id: string; email: string; name: string } };
  }

  it('keeps boards private, then shares tasks with a member', async () => {
    const ada = await register('ada@example.com', 'Ada Lovelace');
    const grace = await register('grace@example.com', 'Grace Hopper');

    const created = await ada.agent.post('/api/boards').send({
      name: 'Analytical Engine',
      description: 'Notes for the next demonstration',
    });
    expect(created.status).toBe(201);
    const boardId = created.body.board.id as string;
    expect(created.body.board.role).toBe('owner');
    expect(created.body.board.members).toHaveLength(1);

    const hidden = await grace.agent.get(`/api/boards/${boardId}`);
    expect(hidden.status).toBe(404);

    const listedByGrace = await grace.agent.get('/api/boards');
    expect(listedByGrace.body.boards).toEqual([]);

    const invited = await ada.agent
      .post(`/api/boards/${boardId}/members`)
      .send({ email: 'grace@example.com' });
    expect(invited.status).toBe(201);
    expect(invited.body.member.email).toBe('grace@example.com');

    const unknown = await ada.agent
      .post(`/api/boards/${boardId}/members`)
      .send({ email: 'missing@example.com' });
    expect(unknown.status).toBe(404);

    const first = await grace.agent.post(`/api/boards/${boardId}/tasks`).send({
      title: 'Sketch the mill',
      description: 'Include the punched-card path',
      assigneeId: ada.user.id,
      dueDate: '2026-11-02',
    });
    expect(first.status).toBe(201);
    expect(first.body.task).toMatchObject({
      title: 'Sketch the mill',
      status: 'todo',
      position: 0,
      assigneeId: ada.user.id,
      dueDate: '2026-11-02',
    });

    const second = await ada.agent.post(`/api/boards/${boardId}/tasks`).send({
      title: 'Write the notes',
      status: 'todo',
    });
    const third = await ada.agent.post(`/api/boards/${boardId}/tasks`).send({
      title: 'Invite the audience',
      status: 'doing',
    });
    expect(second.status).toBe(201);
    expect(third.status).toBe(201);

    const moved = await ada.agent.patch(`/api/tasks/${second.body.task.id}`).send({
      status: 'doing',
      position: 0,
    });
    expect(moved.status).toBe(200);
    expect(moved.body.task.status).toBe('doing');
    expect(moved.body.task.position).toBe(0);

    const reordered = await ada.agent.patch(`/api/tasks/${first.body.task.id}`).send({
      status: 'todo',
      position: 0,
    });
    expect(reordered.status).toBe(200);

    const board = await grace.agent.get(`/api/boards/${boardId}`);
    expect(board.status).toBe(200);
    const detail = board.body.board as BoardBody;
    const doing = detail.tasks.filter((task) => task.status === 'doing').map((task) => task.title);
    expect(doing).toEqual(['Write the notes', 'Invite the audience']);
    expect(detail.counts).toEqual({ todo: 1, doing: 2, done: 0 });

    const outsider = await request(app).patch(`/api/tasks/${first.body.task.id}`).send({
      title: 'Hijacked',
    });
    expect(outsider.status).toBe(401);

    const stranger = await register('alan@example.com', 'Alan Turing');
    const denied = await stranger.agent.patch(`/api/tasks/${first.body.task.id}`).send({
      title: 'Hijacked',
    });
    expect(denied.status).toBe(404);

    const badAssignee = await ada.agent.patch(`/api/tasks/${first.body.task.id}`).send({
      assigneeId: stranger.user.id,
    });
    expect(badAssignee.status).toBe(400);

    const impossibleDay = await ada.agent.post(`/api/boards/${boardId}/tasks`).send({
      title: 'Not a day',
      dueDate: '2026-02-31',
    });
    expect(impossibleDay.status).toBe(400);

    const renamed = await grace.agent.patch(`/api/boards/${boardId}`).send({ name: 'Taken over' });
    expect(renamed.status).toBe(403);

    const removed = await grace.agent.delete(`/api/boards/${boardId}`);
    expect(removed.status).toBe(403);

    await ada.agent.delete(`/api/tasks/${third.body.task.id}`).expect(204);
    const afterDelete = await ada.agent.get(`/api/boards/${boardId}`);
    const doingAfter = (afterDelete.body.board as BoardBody).tasks
      .filter((task) => task.status === 'doing')
      .map((task) => task.title);
    expect(doingAfter).toEqual(['Write the notes']);

    await ada.agent.delete(`/api/boards/${boardId}`).expect(204);
    const gone = await ada.agent.get(`/api/boards/${boardId}`);
    expect(gone.status).toBe(404);
    const home = await ada.agent.get('/api/boards');
    expect(home.body.boards).toEqual([]);
  });
});

describe('comments', () => {
  async function register(email: string, name: string) {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/register').send({
      name,
      email,
      password: 'password123',
    });
    expect(res.status).toBe(201);
    return { agent, user: res.body.user as { id: string; email: string; name: string } };
  }

  it('starts a task at zero comments', async () => {
    const ada = await register('ada@example.com', 'Ada Lovelace');
    const created = await ada.agent.post('/api/boards').send({ name: 'Dock' });
    const boardId = created.body.board.id as string;
    const task = await ada.agent.post(`/api/boards/${boardId}/tasks`).send({ title: 'Coil the line' });
    expect(task.status).toBe(201);
    expect(task.body.task.commentCount).toBe(0);

    const listed = await ada.agent.get(`/api/tasks/${task.body.task.id}/comments`);
    expect(listed.status).toBe(200);
    expect(listed.body.comments).toEqual([]);
  });

  it('stores a trimmed comment and lists comments oldest first', async () => {
    const ada = await register('ada@example.com', 'Ada Lovelace');
    const created = await ada.agent.post('/api/boards').send({ name: 'Dock' });
    const boardId = created.body.board.id as string;
    const task = await ada.agent.post(`/api/boards/${boardId}/tasks`).send({ title: 'Coil the line' });
    const taskId = task.body.task.id as string;

    const first = await ada.agent.post(`/api/tasks/${taskId}/comments`).send({
      body: '  The tide turns at four.  ',
    });
    expect(first.status).toBe(201);
    expect(first.body.comment).toMatchObject({
      taskId,
      body: 'The tide turns at four.',
      author: { id: ada.user.id, name: 'Ada Lovelace', email: 'ada@example.com' },
    });
    expect(first.body.comment.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const second = await ada.agent
      .post(`/api/tasks/${taskId}/comments`)
      .send({ body: 'Bring the spare warp.' });
    expect(second.status).toBe(201);

    const listed = await ada.agent.get(`/api/tasks/${taskId}/comments`);
    expect(listed.body.comments.map((comment: { body: string }) => comment.body)).toEqual([
      'The tide turns at four.',
      'Bring the spare warp.',
    ]);

    const board = await ada.agent.get(`/api/boards/${boardId}`);
    const found = (board.body.board.tasks as { id: string; commentCount: number }[]).find(
      (item) => item.id === taskId,
    );
    expect(found?.commentCount).toBe(2);
  });

  it('lets the author delete a comment and refuses everyone else', async () => {
    const ada = await register('ada@example.com', 'Ada Lovelace');
    const grace = await register('grace@example.com', 'Grace Hopper');
    const stranger = await register('alan@example.com', 'Alan Turing');
    const created = await ada.agent.post('/api/boards').send({ name: 'Dock' });
    const boardId = created.body.board.id as string;
    await ada.agent.post(`/api/boards/${boardId}/members`).send({ email: 'grace@example.com' });
    const task = await ada.agent.post(`/api/boards/${boardId}/tasks`).send({ title: 'Coil the line' });
    const taskId = task.body.task.id as string;
    const other = await ada.agent.post(`/api/boards/${boardId}/tasks`).send({ title: 'Other' });
    const otherId = other.body.task.id as string;

    const comment = await grace.agent
      .post(`/api/tasks/${taskId}/comments`)
      .send({ body: 'The warp is frayed.' });
    expect(comment.status).toBe(201);
    const commentId = comment.body.comment.id as string;

    const kept = await ada.agent.post(`/api/tasks/${otherId}/comments`).send({ body: 'Stay put.' });

    expect((await request(app).get(`/api/tasks/${taskId}/comments`)).status).toBe(401);
    expect((await request(app).post(`/api/tasks/${taskId}/comments`).send({ body: 'No' })).status).toBe(401);
    expect((await request(app).delete(`/api/tasks/${taskId}/comments/${commentId}`)).status).toBe(401);

    expect((await stranger.agent.get(`/api/tasks/${taskId}/comments`)).status).toBe(404);
    expect((await stranger.agent.post(`/api/tasks/${taskId}/comments`).send({ body: 'No' })).status).toBe(404);

    const blank = await grace.agent.post(`/api/tasks/${taskId}/comments`).send({ body: '   ' });
    expect(blank.status).toBe(400);
    expect(blank.body.error).toBe('Comment is required');
    const huge = await grace.agent
      .post(`/api/tasks/${taskId}/comments`)
      .send({ body: 'x'.repeat(2001) });
    expect(huge.status).toBe(400);
    expect(huge.body.error).toBe('Comment is too long');

    const denied = await ada.agent.delete(`/api/tasks/${taskId}/comments/${commentId}`);
    expect(denied.status).toBe(403);
    expect(denied.body.error).toBe('You can only delete your own comments');

    const wrongTask = await grace.agent.delete(`/api/tasks/${otherId}/comments/${commentId}`);
    expect(wrongTask.status).toBe(404);
    const stillThere = await ada.agent.get(`/api/tasks/${taskId}/comments`);
    expect(stillThere.body.comments).toHaveLength(1);

    const removed = await grace.agent.delete(`/api/tasks/${taskId}/comments/${commentId}`);
    expect(removed.status).toBe(204);
    const after = await ada.agent.get(`/api/tasks/${taskId}/comments`);
    expect(after.body.comments).toEqual([]);
    const board = await ada.agent.get(`/api/boards/${boardId}`);
    const found = (board.body.board.tasks as { id: string; commentCount: number }[]).find(
      (item) => item.id === taskId,
    );
    expect(found?.commentCount).toBe(0);

    const leftover = await ada.agent.get(`/api/tasks/${otherId}/comments`);
    expect(leftover.body.comments.map((item: { id: string }) => item.id)).toEqual([
      kept.body.comment.id,
    ]);
  });

  it("keeps a removed member's comment and drops comments when the task is deleted", async () => {
    const ada = await register('ada@example.com', 'Ada Lovelace');
    const grace = await register('grace@example.com', 'Grace Hopper');
    const created = await ada.agent.post('/api/boards').send({ name: 'Dock' });
    const boardId = created.body.board.id as string;
    await ada.agent.post(`/api/boards/${boardId}/members`).send({ email: 'grace@example.com' });
    const task = await ada.agent.post(`/api/boards/${boardId}/tasks`).send({ title: 'Coil the line' });
    const taskId = task.body.task.id as string;
    await grace.agent.post(`/api/tasks/${taskId}/comments`).send({ body: 'I logged the warp.' });

    await ada.agent.delete(`/api/boards/${boardId}/members/${grace.user.id}`).expect(204);
    const listed = await ada.agent.get(`/api/tasks/${taskId}/comments`);
    expect(listed.body.comments).toHaveLength(1);
    expect(listed.body.comments[0].author.name).toBe('Grace Hopper');

    await ada.agent.delete(`/api/tasks/${taskId}`).expect(204);
    const count = app.locals.db
      .prepare('SELECT COUNT(*) AS count FROM comments')
      .get() as { count: number };
    expect(count.count).toBe(0);
  });
});
