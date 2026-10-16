import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Agent } from 'supertest';
import type { Task } from '@boardline/shared';
import { createApp } from '../src/app';
import { openDatabase } from '../src/db';

function setup() {
  const db = openDatabase(':memory:');
  const app = createApp(db);
  return { db, app };
}

async function register(app: ReturnType<typeof createApp>, name: string, email: string): Promise<Agent> {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ name, email, password: 'password1' });
  if (res.status !== 201) throw new Error(`register failed: ${res.status}`);
  return agent;
}

describe('tasks', () => {
  it('creates, updates, moves, and deletes a task for a board member', async () => {
    const { db, app } = setup();
    const ada = await register(app, 'Ada Lovelace', 'ada@example.com');
    const grace = await register(app, 'Grace Hopper', 'grace@example.com');
    const board = await ada.post('/api/boards').send({ name: 'Launch' });
    const boardId = board.body.id as string;
    await ada.post(`/api/boards/${boardId}/members`).send({ email: 'grace@example.com' });
    const detail = await ada.get(`/api/boards/${boardId}`);
    const adaId = detail.body.members.find((member: { email: string }) => member.email === 'ada@example.com').id as string;

    const unauthenticated = await request(app).post(`/api/boards/${boardId}/tasks`).send({ title: 'Nope' });
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body.error).toBe('Sign in required.');

    const blank = await grace.post(`/api/boards/${boardId}/tasks`).send({ title: '   ' });
    expect(blank.status).toBe(400);
    expect(blank.body.error).toBe('Title is required.');

    const badDate = await grace.post(`/api/boards/${boardId}/tasks`).send({
      title: 'Write spec',
      dueDate: '20-10-2026',
    });
    expect(badDate.status).toBe(400);
    expect(badDate.body.error).toBe('Due date must be YYYY-MM-DD.');

    const outsider = await grace.post(`/api/boards/${boardId}/tasks`).send({
      title: 'Write spec',
      assigneeId: 'not-a-member',
    });
    expect(outsider.status).toBe(400);
    expect(outsider.body.error).toBe('Assignee is not on this board.');

    const badStatus = await grace.post(`/api/boards/${boardId}/tasks`).send({
      title: 'Write spec',
      status: 'later',
    });
    expect(badStatus.status).toBe(400);
    expect(badStatus.body.error).toBe('Status must be todo, doing, or done.');

    const created = await grace.post(`/api/boards/${boardId}/tasks`).send({
      title: 'Write spec',
      description: 'Notes',
      dueDate: '2026-10-20',
      assigneeId: adaId,
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      boardId,
      title: 'Write spec',
      description: 'Notes',
      status: 'todo',
      assigneeId: adaId,
      dueDate: '2026-10-20',
      position: 0,
    });

    const second = await grace.post(`/api/boards/${boardId}/tasks`).send({ title: 'Review' });
    expect(second.status).toBe(201);
    expect(second.body.position).toBe(1);
    expect(second.body.description).toBe('');
    expect(second.body.assigneeId).toBeNull();
    expect(second.body.dueDate).toBeNull();

    const moved = await grace.patch(`/api/tasks/${created.body.id}`).send({ status: 'doing' });
    expect(moved.status).toBe(200);
    expect(moved.body.status).toBe('doing');
    expect(moved.body.position).toBe(0);

    const afterMove = await ada.get(`/api/boards/${boardId}`);
    const tasks = afterMove.body.tasks as Task[];
    const review = tasks.find((task) => task.id === second.body.id);
    expect(review).toMatchObject({ status: 'todo', position: 0 });

    const front = await grace.patch(`/api/tasks/${second.body.id}`).send({ status: 'doing', position: 0 });
    expect(front.status).toBe(200);
    expect(front.body).toMatchObject({ status: 'doing', position: 0 });
    const shifted = await ada.get(`/api/boards/${boardId}`);
    const spec = (shifted.body.tasks as Task[]).find((task) => task.id === created.body.id);
    expect(spec).toMatchObject({ status: 'doing', position: 1 });

    const cleared = await grace.patch(`/api/tasks/${created.body.id}`).send({
      title: 'Write the spec',
      description: '',
      assigneeId: null,
      dueDate: null,
    });
    expect(cleared.status).toBe(200);
    expect(cleared.body).toMatchObject({
      title: 'Write the spec',
      description: '',
      assigneeId: null,
      dueDate: null,
    });

    const stranger = request.agent(app);
    await stranger.post('/api/auth/register').send({
      name: 'Lin',
      email: 'lin@example.com',
      password: 'password1',
    });
    const denied = await stranger.patch(`/api/tasks/${created.body.id}`).send({ title: 'Stolen' });
    expect(denied.status).toBe(404);
    expect(denied.body.error).toBe('Task not found.');
    const still = db.prepare('SELECT title FROM tasks WHERE id = ?').get(created.body.id) as { title: string };
    expect(still.title).toBe('Write the spec');

    const removed = await grace.delete(`/api/tasks/${second.body.id}`);
    expect(removed.status).toBe(204);
    const gone = await ada.get(`/api/boards/${boardId}`);
    expect((gone.body.tasks as Task[]).some((task) => task.id === second.body.id)).toBe(false);
    db.close();
  });
});
