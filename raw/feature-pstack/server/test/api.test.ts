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

  it('lets a member comment, and only the author can delete', async () => {
    const ada = await register('ada@example.com', 'Ada Lovelace');
    const grace = await register('grace@example.com', 'Grace Hopper');
    const alan = await register('alan@example.com', 'Alan Turing');

    const createdBoard = await ada.agent.post('/api/boards').send({ name: 'Mill notes' });
    expect(createdBoard.status).toBe(201);
    const boardId = createdBoard.body.board.id as string;

    const invited = await ada.agent
      .post(`/api/boards/${boardId}/members`)
      .send({ email: 'grace@example.com' });
    expect(invited.status).toBe(201);

    const created = await ada.agent.post(`/api/boards/${boardId}/tasks`).send({
      title: 'Sketch the mill',
    });
    expect(created.status).toBe(201);
    const taskId = created.body.task.id as string;
    const updatedAt = created.body.task.updatedAt as string;
    expect(created.body.task.commentCount).toBe(0);

    const before = await ada.agent.get(`/api/boards/${boardId}`);
    expect(before.body.board.counts).toEqual({ todo: 1, doing: 0, done: 0 });

    const atlas = await ada.agent.post('/api/boards').send({ name: 'Atlas' });
    expect(atlas.status).toBe(201);
    const listedBefore = await ada.agent.get('/api/boards');
    expect(listedBefore.body.boards.map((board: { name: string }) => board.name)).toEqual([
      'Atlas',
      'Mill notes',
    ]);

    const blank = await ada.agent.post(`/api/tasks/${taskId}/comments`).send({ body: '   ' });
    expect(blank.status).toBe(400);
    expect(blank.body.error).toBe('Comment is required');

    const overlong = await ada.agent
      .post(`/api/tasks/${taskId}/comments`)
      .send({ body: 'x'.repeat(2001) });
    expect(overlong.status).toBe(400);
    expect(overlong.body.error).toBe('Comment is too long');

    const posted = await ada.agent
      .post(`/api/tasks/${taskId}/comments`)
      .send({ body: '  Include the card path  ' });
    expect(posted.status).toBe(201);
    expect(Object.keys(posted.body.comment).sort()).toEqual(['author', 'body', 'createdAt', 'id']);
    expect(posted.body.comment).toMatchObject({
      body: 'Include the card path',
      author: { id: ada.user.id, name: 'Ada Lovelace', email: 'ada@example.com' },
    });
    const adaCommentId = posted.body.comment.id as string;

    const gracePosted = await grace.agent
      .post(`/api/tasks/${taskId}/comments`)
      .send({ body: 'I can help with the mill' });
    expect(gracePosted.status).toBe(201);
    expect(gracePosted.body.comment.author.name).toBe('Grace Hopper');

    const listed = await ada.agent.get(`/api/tasks/${taskId}/comments`);
    expect(listed.status).toBe(200);
    const comments = listed.body.comments as { id: string; createdAt: string; body: string }[];
    expect(comments.map((comment) => comment.body).sort()).toEqual([
      'I can help with the mill',
      'Include the card path',
    ]);
    expect(
      [...comments].sort(
        (left, right) =>
          left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
      ),
    ).toEqual(comments);

    const after = await ada.agent.get(`/api/boards/${boardId}`);
    const stored = (after.body.board.tasks as { id: string; commentCount: number; updatedAt: string }[]).find(
      (task) => task.id === taskId,
    );
    expect(stored).toMatchObject({ commentCount: 2, updatedAt });
    expect(after.body.board.counts).toEqual({ todo: 1, doing: 0, done: 0 });

    const listedAfter = await ada.agent.get('/api/boards');
    expect(listedAfter.body.boards.map((board: { name: string }) => board.name)).toEqual([
      'Mill notes',
      'Atlas',
    ]);

    const forbidden = await grace.agent.delete(`/api/tasks/${taskId}/comments/${adaCommentId}`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error).toBe('Only the author can delete this comment');

    const removed = await ada.agent.delete(`/api/tasks/${taskId}/comments/${adaCommentId}`);
    expect(removed.status).toBe(204);

    const removedAgain = await ada.agent.delete(`/api/tasks/${taskId}/comments/${adaCommentId}`);
    expect(removedAgain.status).toBe(404);
    expect(removedAgain.body.error).toBe('Comment not found');

    const afterDelete = await ada.agent.get(`/api/boards/${boardId}`);
    const remainingTask = (
      afterDelete.body.board.tasks as { id: string; commentCount: number; updatedAt: string }[]
    ).find((task) => task.id === taskId);
    expect(remainingTask).toMatchObject({ commentCount: 1, updatedAt });

    const patched = await ada.agent.patch(`/api/tasks/${taskId}`).send({ body: 'hello' });
    expect(patched.status).toBe(400);
    expect(patched.body.error).toBe('Nothing to update');

    const signedOut = await request(app).get(`/api/tasks/${taskId}/comments`);
    expect(signedOut.status).toBe(401);
    expect(signedOut.body.error).toBe('Sign in required');

    const stranger = await alan.agent.get(`/api/tasks/${taskId}/comments`);
    expect(stranger.status).toBe(404);
    expect(stranger.body.error).toBe('Board not found');

    const left = await grace.agent.delete(`/api/boards/${boardId}/members/${grace.user.id}`);
    expect(left.status).toBe(204);

    const afterLeave = await ada.agent.get(`/api/tasks/${taskId}/comments`);
    expect(afterLeave.status).toBe(200);
    expect(afterLeave.body.comments).toEqual([
      {
        id: gracePosted.body.comment.id,
        body: 'I can help with the mill',
        createdAt: gracePosted.body.comment.createdAt,
        author: { id: grace.user.id, name: 'Grace Hopper', email: 'grace@example.com' },
      },
    ]);

    const deletedTask = await ada.agent.delete(`/api/tasks/${taskId}`);
    expect(deletedTask.status).toBe(204);
    const afterTask = await ada.agent.get(`/api/tasks/${taskId}/comments`);
    expect(afterTask.status).toBe(404);
    expect(afterTask.body.error).toBe('Task not found');

    const leftover = await ada.agent.post(`/api/boards/${boardId}/tasks`).send({ title: 'Keep a note' });
    expect(leftover.status).toBe(201);
    const noted = await ada.agent
      .post(`/api/tasks/${leftover.body.task.id}/comments`)
      .send({ body: 'Still here' });
    expect(noted.status).toBe(201);

    const deletedBoard = await ada.agent.delete(`/api/boards/${boardId}`);
    expect(deletedBoard.status).toBe(204);
    const afterBoard = await ada.agent.get(`/api/boards/${boardId}`);
    expect(afterBoard.status).toBe(404);
  });
});
