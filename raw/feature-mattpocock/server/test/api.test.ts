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
  commentCount: number;
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

describe('task comments', () => {
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

  async function boardWithTask(ownerEmail = 'ada@example.com', ownerName = 'Ada Lovelace') {
    const owner = await register(ownerEmail, ownerName);
    const board = await owner.agent.post('/api/boards').send({ name: 'Analytical Engine' });
    expect(board.status).toBe(201);
    const boardId = board.body.board.id as string;
    const created = await owner.agent
      .post(`/api/boards/${boardId}/tasks`)
      .send({ title: 'Sketch the mill' });
    expect(created.status).toBe(201);
    expect(created.body.task.commentCount).toBe(0);
    return { owner, boardId, taskId: created.body.task.id as string };
  }

  it('lets a member add a comment with their name and time, and counts it on the task', async () => {
    const { owner, boardId, taskId } = await boardWithTask();

    const posted = await owner.agent.post(`/api/tasks/${taskId}/comments`).send({
      body: 'The cards should feed from the left.',
    });
    expect(posted.status).toBe(201);
    expect(posted.body.comment).toMatchObject({
      taskId,
      body: 'The cards should feed from the left.',
      author: { id: owner.user.id, name: 'Ada Lovelace', email: 'ada@example.com' },
    });
    expect(posted.body.comment.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    const listed = await owner.agent.get(`/api/tasks/${taskId}/comments`);
    expect(listed.status).toBe(200);
    expect(listed.body.comments).toEqual([
      {
        id: posted.body.comment.id,
        taskId,
        body: 'The cards should feed from the left.',
        createdAt: posted.body.comment.createdAt,
        author: { id: owner.user.id, name: 'Ada Lovelace', email: 'ada@example.com' },
      },
    ]);

    const again = await owner.agent.get(`/api/boards/${boardId}`);
    const task = (again.body.board as BoardBody).tasks.find((item) => item.id === taskId);
    expect(task?.commentCount).toBe(1);
  });

  it('lets the author delete their comment and refuses anyone else', async () => {
    const { owner, boardId, taskId } = await boardWithTask();
    const grace = await register('grace@example.com', 'Grace Hopper');
    await owner.agent
      .post(`/api/boards/${boardId}/members`)
      .send({ email: 'grace@example.com' })
      .expect(201);

    const posted = await owner.agent.post(`/api/tasks/${taskId}/comments`).send({
      body: 'Hold the demonstration until Thursday.',
    });
    expect(posted.status).toBe(201);
    const commentId = posted.body.comment.id as string;

    const denied = await grace.agent.delete(`/api/tasks/${taskId}/comments/${commentId}`);
    expect(denied.status).toBe(403);

    const stillThere = await grace.agent.get(`/api/tasks/${taskId}/comments`);
    expect(stillThere.body.comments).toHaveLength(1);

    await owner.agent.delete(`/api/tasks/${taskId}/comments/${commentId}`).expect(204);

    const gone = await owner.agent.get(`/api/tasks/${taskId}/comments`);
    expect(gone.body.comments).toEqual([]);
    const missing = await owner.agent.delete(`/api/tasks/${taskId}/comments/${commentId}`);
    expect(missing.status).toBe(404);

    const board = await owner.agent.get(`/api/boards/${boardId}`);
    const task = (board.body.board as BoardBody).tasks.find((item) => item.id === taskId);
    expect(task?.commentCount).toBe(0);
  });

  it('keeps comments in the order they were written', async () => {
    const { owner, boardId, taskId } = await boardWithTask();
    const grace = await register('grace@example.com', 'Grace Hopper');
    await owner.agent.post(`/api/boards/${boardId}/members`).send({ email: 'grace@example.com' });

    const first = await owner.agent
      .post(`/api/tasks/${taskId}/comments`)
      .send({ body: 'First note.' });
    const second = await grace.agent
      .post(`/api/tasks/${taskId}/comments`)
      .send({ body: 'Second note.' });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const listed = await grace.agent.get(`/api/tasks/${taskId}/comments`);
    expect(listed.body.comments.map((comment: { body: string }) => comment.body)).toEqual([
      'First note.',
      'Second note.',
    ]);
    expect(listed.body.comments[1].author.name).toBe('Grace Hopper');
  });

  it('hides comments from people who are not on the board', async () => {
    const { taskId } = await boardWithTask();
    const stranger = await register('alan@example.com', 'Alan Turing');

    const listed = await stranger.agent.get(`/api/tasks/${taskId}/comments`);
    expect(listed.status).toBe(404);

    const posted = await stranger.agent
      .post(`/api/tasks/${taskId}/comments`)
      .send({ body: 'I was not invited.' });
    expect(posted.status).toBe(404);

    const signedOut = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .send({ body: 'No session.' });
    expect(signedOut.status).toBe(401);
  });

  it('rejects an empty comment', async () => {
    const { owner, taskId } = await boardWithTask();
    const blank = await owner.agent.post(`/api/tasks/${taskId}/comments`).send({ body: '   ' });
    expect(blank.status).toBe(400);
    expect(blank.body.error).toMatch(/required/i);

    const listed = await owner.agent.get(`/api/tasks/${taskId}/comments`);
    expect(listed.body.comments).toEqual([]);
  });
});
