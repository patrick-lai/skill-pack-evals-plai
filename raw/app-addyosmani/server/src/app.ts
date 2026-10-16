import express, { type Express } from 'express'
import { attachUser, type AppContext } from './context.ts'
import { openDatabase } from './db.ts'
import { errorHandler } from './http.ts'
import { log } from './log.ts'
import { createRateLimiter } from './rate-limit.ts'
import { authRouter } from './routes/auth.ts'
import { boardsRouter } from './routes/boards.ts'
import { tasksRouter } from './routes/tasks.ts'

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/

function missingSecret(): string {
  throw new Error('A session secret is required. Set SESSION_SECRET or start the server with npm start.')
}

export interface CreateAppOptions {
  db?: AppContext['db']
  sessionSecret?: string
  secureCookie?: boolean
  clientOrigin?: string
}

export function createApp(options: CreateAppOptions = {}): Express {
  const ctx: AppContext = {
    db: options.db ?? openDatabase(process.env.DATABASE_PATH ?? 'data/board.sqlite'),
    sessionSecret: options.sessionSecret ?? missingSecret(),
    secureCookie: options.secureCookie ?? process.env.NODE_ENV === 'production',
    limitAuth: createRateLimiter(10, 15 * 60 * 1000),
    clientOrigin: options.clientOrigin ?? process.env.CLIENT_ORIGIN ?? 'http://127.0.0.1:43123',
  }

  const app = express()
  app.disable('x-powered-by')
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
    next()
  })
  app.use((req, res, next) => {
    const origin = req.headers.origin
    if (typeof origin === 'string' && (origin === ctx.clientOrigin || LOCAL_ORIGIN.test(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204)
      return
    }
    next()
  })
  app.use(express.json({ limit: '64kb' }))
  app.use((req, res, next) => {
    const started = Date.now()
    res.on('finish', () => {
      const path = req.originalUrl.split('?')[0] ?? req.path
      log('info', 'http', {
        method: req.method,
        path,
        status: res.statusCode,
        ms: Date.now() - started,
        userId: req.user?.id ?? null,
      })
    })
    next()
  })

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })
  app.use('/api/auth', authRouter(ctx))
  app.use('/api/boards/:boardId/tasks', (req, res, next) => {
    const user = attachUser(ctx, req)
    if (!user) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue.' } })
      return
    }
    next()
  }, tasksRouter(ctx))
  app.use('/api/boards', (req, res, next) => {
    const user = attachUser(ctx, req)
    if (!user) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue.' } })
      return
    }
    next()
  }, boardsRouter(ctx))
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No such API route.' } })
  })
  app.use(errorHandler)
  return app
}
