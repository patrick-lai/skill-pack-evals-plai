import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { makeApp, register } from './helpers.ts'

describe('auth', () => {
  it('registers a user and keeps the session', async () => {
    const { app } = makeApp()
    const { agent, user } = await register(app, 'ada@example.com')

    expect(user).toMatchObject({ email: 'ada@example.com', name: 'Ada Lovelace' })
    expect(user.id).toBeTruthy()
    expect(JSON.stringify(user)).not.toContain('password')
    const me = await agent.get('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.user.email).toBe('ada@example.com')
  })

  it('sets HttpOnly and SameSite on the session cookie', async () => {
    const { app } = makeApp()
    const response = await request(app).post('/api/auth/register').send({
      email: 'cookie@example.com',
      name: 'Cookie',
      password: 'password123',
    })
    const cookie = String(response.headers['set-cookie'])
    expect(response.status).toBe(201)
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)
    expect(response.headers['x-content-type-options']).toBe('nosniff')
  })

  it('rejects a duplicate email', async () => {
    const { app } = makeApp()
    await register(app, 'ada@example.com')
    const again = await request(app).post('/api/auth/register').send({
      email: 'Ada@example.com',
      name: 'Ada',
      password: 'password123',
    })
    expect(again.status).toBe(409)
    expect(again.body.error.code).toBe('EMAIL_TAKEN')
  })

  it('rejects a short password', async () => {
    const { app } = makeApp()
    const response = await request(app).post('/api/auth/register').send({
      email: 'ada@example.com',
      name: 'Ada',
      password: 'short',
    })
    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('uses the same error for an unknown email and a wrong password', async () => {
    const { app } = makeApp()
    await register(app, 'ada@example.com')
    const wrong = await request(app).post('/api/auth/login').send({
      email: 'ada@example.com',
      password: 'not-the-password',
    })
    const missing = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'not-the-password',
    })
    expect(wrong.status).toBe(401)
    expect(missing.status).toBe(401)
    expect(wrong.body.error.message).toBe(missing.body.error.message)
    expect(JSON.stringify(wrong.body)).not.toContain('password_hash')
  })

  it('logs in and then logs out', async () => {
    const { app } = makeApp()
    await register(app, 'ada@example.com')
    const agent = request.agent(app)
    const login = await agent.post('/api/auth/login').send({ email: 'ada@example.com', password: 'password123' })
    expect(login.status).toBe(200)
    expect(login.body.user.name).toBe('Ada Lovelace')
    const out = await agent.post('/api/auth/logout')
    expect(out.status).toBe(204)
    const me = await agent.get('/api/auth/me')
    expect(me.status).toBe(401)
  })

  it('requires a session for boards', async () => {
    const { app } = makeApp()
    const response = await request(app).get('/api/boards')
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHENTICATED')
  })

  it('rate limits repeated login attempts', async () => {
    const { app } = makeApp()
    let status = 0
    for (let attempt = 0; attempt < 11; attempt += 1) {
      const response = await request(app).post('/api/auth/login').send({
        email: 'ada@example.com',
        password: 'not-the-password',
      })
      status = response.status
    }
    expect(status).toBe(429)
    expect(status).toBeGreaterThan(0)
  })
})
