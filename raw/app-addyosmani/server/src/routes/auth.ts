import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import type { User } from '@bench/shared'
import { attachUser, type AppContext } from '../context.ts'
import { get, run } from '../db.ts'
import { HttpError, parseBody, wrap } from '../http.ts'
import { log } from '../log.ts'
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from '../passwords.ts'
import { clearSessionCookie, createSession, destroySession, readCookie, setSessionCookie, COOKIE_NAME } from '../session.ts'
import { loginSchema, registerSchema } from '../validate.ts'

interface UserRow {
  id: string
  email: string
  name: string
  password_hash: string
}

function publicUser(row: Pick<UserRow, 'id' | 'email' | 'name'>): User {
  return { id: row.id, email: row.email, name: row.name }
}

export function authRouter(ctx: AppContext): Router {
  const router = Router()

  router.post(
    '/register',
    wrap(async (req, res) => {
      const input = parseBody(registerSchema, req.body)
      if (!ctx.limitAuth(`${req.ip}:register:${input.email}`)) {
        throw new HttpError(429, 'RATE_LIMITED', 'Too many attempts. Wait a few minutes and try again.')
      }
      const existing = get<{ id: string }>(ctx.db, 'SELECT id FROM users WHERE email = ?', input.email)
      if (existing) throw new HttpError(409, 'EMAIL_TAKEN', 'An account with that email already exists.')

      const user = { id: randomUUID(), email: input.email, name: input.name }
      const now = new Date().toISOString()
      run(
        ctx.db,
        'INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
        user.id,
        user.email,
        user.name,
        hashPassword(input.password),
        now,
      )
      const token = createSession(ctx.db, user.id, ctx.sessionSecret)
      setSessionCookie(res, token, ctx.secureCookie)
      log('info', 'auth.register', { userId: user.id })
      res.status(201).json({ user })
    }),
  )

  router.post(
    '/login',
    wrap(async (req, res) => {
      const input = parseBody(loginSchema, req.body)
      if (!ctx.limitAuth(`${req.ip}:login:${input.email}`)) {
        throw new HttpError(429, 'RATE_LIMITED', 'Too many attempts. Wait a few minutes and try again.')
      }
      const row = get<UserRow>(
        ctx.db,
        'SELECT id, email, name, password_hash FROM users WHERE email = ?',
        input.email,
      )
      const matches = verifyPassword(input.password, row?.password_hash ?? DUMMY_PASSWORD_HASH)
      if (!row || !matches) {
        log('warn', 'auth.login.failure', {})
        throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.')
      }
      const token = createSession(ctx.db, row.id, ctx.sessionSecret)
      setSessionCookie(res, token, ctx.secureCookie)
      log('info', 'auth.login', { userId: row.id })
      res.json({ user: publicUser(row) })
    }),
  )

  router.post(
    '/logout',
    wrap(async (req, res) => {
      destroySession(ctx.db, readCookie(req.headers.cookie, COOKIE_NAME), ctx.sessionSecret)
      clearSessionCookie(res)
      res.status(204).end()
    }),
  )

  router.get(
    '/me',
    wrap(async (req, res) => {
      const user = attachUser(ctx, req)
      if (!user) throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue.')
      res.json({ user })
    }),
  )

  return router
}
