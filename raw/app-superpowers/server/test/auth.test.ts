import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { openDatabase } from '../src/db';
import { hashPassword, verifyPassword } from '../src/passwords';

function setup() {
  const db = openDatabase(':memory:');
  const app = createApp(db);
  return { db, app };
}

describe('passwords', () => {
  it('accepts the password that was hashed and rejects a different one', () => {
    const encoded = hashPassword('password1');
    expect(verifyPassword('password1', encoded)).toBe(true);
    expect(verifyPassword('password2', encoded)).toBe(false);
    expect(verifyPassword('password1', 'nope')).toBe(false);
  });
});

describe('auth routes', () => {
  it('registers a user, sets a session, and returns that user from me', async () => {
    const { db, app } = setup();
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/register').send({
      name: 'Ada Lovelace',
      email: 'Ada@Example.com',
      password: 'password1',
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      email: 'ada@example.com',
      name: 'Ada Lovelace',
    });
    expect(typeof res.body.user.id).toBe('string');
    expect(JSON.stringify(res.body)).not.toContain('scrypt$');
    expect(res.headers['set-cookie']?.[0]).toContain('boardline_session=');
    expect(res.headers['set-cookie']?.[0]).toContain('HttpOnly');

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user).toEqual(res.body.user);
    db.close();
  });

  it('rejects a short password, a bad email, a blank name, and a duplicate email', async () => {
    const { db, app } = setup();
    const short = await request(app).post('/api/auth/register').send({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'short',
    });
    expect(short.status).toBe(400);
    expect(short.body.error).toBe('Password must be at least 8 characters.');

    const email = await request(app).post('/api/auth/register').send({
      name: 'Ada',
      email: 'not-an-email',
      password: 'password1',
    });
    expect(email.status).toBe(400);
    expect(email.body.error).toBe('Enter a valid email.');

    const name = await request(app).post('/api/auth/register').send({
      name: '   ',
      email: 'ada@example.com',
      password: 'password1',
    });
    expect(name.status).toBe(400);
    expect(name.body.error).toBe('Name is required.');

    await request(app).post('/api/auth/register').send({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'password1',
    });
    const duplicate = await request(app).post('/api/auth/register').send({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'password1',
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toBe('An account with that email already exists.');
    db.close();
  });

  it('logs in with the right password and rejects a wrong or unknown email the same way', async () => {
    const { db, app } = setup();
    await request(app).post('/api/auth/register').send({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'password1',
    });

    const agent = request.agent(app);
    const ok = await agent.post('/api/auth/login').send({
      email: 'ada@example.com',
      password: 'password1',
    });
    expect(ok.status).toBe(200);
    expect(ok.body.user.email).toBe('ada@example.com');
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);

    const wrong = await request(app).post('/api/auth/login').send({
      email: 'ada@example.com',
      password: 'wrong-password',
    });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error).toBe('Email or password is incorrect.');

    const unknown = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'password1',
    });
    expect(unknown.status).toBe(401);
    expect(unknown.body.error).toBe('Email or password is incorrect.');
    db.close();
  });

  it('logout ends the session', async () => {
    const { db, app } = setup();
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'password1',
    });
    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(204);
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(401);
    expect(me.body.error).toBe('Sign in required.');
    db.close();
  });

  it('treats an expired session as signed out', async () => {
    const { db, app } = setup();
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'password1',
    });
    db.prepare('UPDATE sessions SET expires_at = ?').run('2000-01-01T00:00:00.000Z');
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(401);
    expect(me.body.error).toBe('Sign in required.');
    db.close();
  });
});
