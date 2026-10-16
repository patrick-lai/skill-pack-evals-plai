import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Agent } from 'supertest';
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

describe('boards', () => {
  it('requires a session to list boards', async () => {
    const { db, app } = setup();
    const res = await request(app).get('/api/boards');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Sign in required.');
    db.close();
  });

  it('creates a board for the owner and lists only that owner\'s boards', async () => {
    const { db, app } = setup();
    const ada = await register(app, 'Ada', 'ada@example.com');
    const grace = await register(app, 'Grace', 'grace@example.com');

    const created = await ada.post('/api/boards').send({ name: 'Launch' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: 'Launch', role: 'owner', taskCount: 0 });
    expect(typeof created.body.id).toBe('string');

    const blank = await ada.post('/api/boards').send({ name: '   ' });
    expect(blank.status).toBe(400);
    expect(blank.body.error).toBe('Board name is required.');

    const list = await ada.get('/api/boards');
    expect(list.status).toBe(200);
    expect(list.body.boards).toEqual([
      expect.objectContaining({ id: created.body.id, name: 'Launch', role: 'owner', taskCount: 0 }),
    ]);

    const hidden = await grace.get('/api/boards');
    expect(hidden.body.boards).toEqual([]);
    const missing = await grace.get(`/api/boards/${created.body.id}`);
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('Board not found.');
    db.close();
  });

  it('lets the owner add a member by email and keeps owner actions to the owner', async () => {
    const { db, app } = setup();
    const ada = await register(app, 'Ada Lovelace', 'ada@example.com');
    const grace = await register(app, 'Grace Hopper', 'grace@example.com');
    const board = await ada.post('/api/boards').send({ name: 'Launch' });
    const boardId = board.body.id as string;

    const missing = await ada.post(`/api/boards/${boardId}/members`).send({ email: 'missing@example.com' });
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('No account with that email.');

    const added = await ada.post(`/api/boards/${boardId}/members`).send({ email: 'Grace@Example.com' });
    expect(added.status).toBe(201);
    expect(added.body).toMatchObject({ email: 'grace@example.com', name: 'Grace Hopper', role: 'member' });

    const again = await ada.post(`/api/boards/${boardId}/members`).send({ email: 'grace@example.com' });
    expect(again.status).toBe(409);
    expect(again.body.error).toBe('That person is already on this board.');

    const invite = await grace.post(`/api/boards/${boardId}/members`).send({ email: 'ada@example.com' });
    expect(invite.status).toBe(403);
    expect(invite.body.error).toBe('Only the owner can do that.');

    const seen = await grace.get(`/api/boards/${boardId}`);
    expect(seen.status).toBe(200);
    expect(seen.body.role).toBe('member');
    expect(seen.body.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: 'ada@example.com', role: 'owner' }),
        expect.objectContaining({ email: 'grace@example.com', role: 'member' }),
      ]),
    );

    const rename = await grace.patch(`/api/boards/${boardId}`).send({ name: 'Nope' });
    expect(rename.status).toBe(403);
    expect(rename.body.error).toBe('Only the owner can do that.');
    const renamed = await ada.patch(`/api/boards/${boardId}`).send({ name: 'Ship' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe('Ship');

    const memberDelete = await grace.delete(`/api/boards/${boardId}`);
    expect(memberDelete.status).toBe(403);
    expect(memberDelete.body.error).toBe('Only the owner can do that.');

    const owner = seen.body.members.find((member: { role: string }) => member.role === 'owner');
    const removeOwner = await ada.delete(`/api/boards/${boardId}/members/${owner.id}`);
    expect(removeOwner.status).toBe(400);
    expect(removeOwner.body.error).toBe('The owner cannot be removed.');
    db.close();
  });

  it('clears that member\'s assignments on the board when they are removed', async () => {
    const { db, app } = setup();
    const ada = await register(app, 'Ada', 'ada@example.com');
    const grace = await register(app, 'Grace', 'grace@example.com');
    const launch = await ada.post('/api/boards').send({ name: 'Launch' });
    const other = await ada.post('/api/boards').send({ name: 'Other' });
    await ada.post(`/api/boards/${launch.body.id}/members`).send({ email: 'grace@example.com' });
    await ada.post(`/api/boards/${other.body.id}/members`).send({ email: 'grace@example.com' });

    const graceId = (
      db.prepare('SELECT id FROM users WHERE email = ?').get('grace@example.com') as { id: string }
    ).id;
    const now = '2026-10-15T00:00:00.000Z';
    db.prepare(
      `INSERT INTO tasks (id, board_id, title, description, status, assignee_id, due_date, position, created_at, updated_at)
       VALUES (?, ?, 'A', '', 'todo', ?, NULL, 0, ?, ?)`,
    ).run('task-launch', launch.body.id, graceId, now, now);
    db.prepare(
      `INSERT INTO tasks (id, board_id, title, description, status, assignee_id, due_date, position, created_at, updated_at)
       VALUES (?, ?, 'B', '', 'todo', ?, NULL, 0, ?, ?)`,
    ).run('task-other', other.body.id, graceId, now, now);

    const removed = await ada.delete(`/api/boards/${launch.body.id}/members/${graceId}`);
    expect(removed.status).toBe(204);

    const launchTask = db.prepare('SELECT assignee_id FROM tasks WHERE id = ?').get('task-launch') as {
      assignee_id: string | null;
    };
    const otherTask = db.prepare('SELECT assignee_id FROM tasks WHERE id = ?').get('task-other') as {
      assignee_id: string | null;
    };
    expect(launchTask.assignee_id).toBeNull();
    expect(otherTask.assignee_id).toBe(graceId);
    db.close();
  });

  it('deletes a board for the owner', async () => {
    const { db, app } = setup();
    const ada = await register(app, 'Ada', 'ada@example.com');
    const created = await ada.post('/api/boards').send({ name: 'Launch' });
    const removed = await ada.delete(`/api/boards/${created.body.id}`);
    expect(removed.status).toBe(204);
    const after = await ada.get(`/api/boards/${created.body.id}`);
    expect(after.status).toBe(404);
    expect(after.body.error).toBe('Board not found.');
    db.close();
  });
});
