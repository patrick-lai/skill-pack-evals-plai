import type { User } from '@bench/shared'
import type { Request } from 'express'
import type { DatabaseSync } from 'node:sqlite'
import { readCookie, userForToken, COOKIE_NAME } from './session.ts'

export interface AppContext {
  db: DatabaseSync
  sessionSecret: string
  secureCookie: boolean
  limitAuth: (key: string) => boolean
  clientOrigin: string
}

declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

export function attachUser(ctx: AppContext, req: Request): User | undefined {
  const token = readCookie(req.headers.cookie, COOKIE_NAME)
  const user = userForToken(ctx.db, token, ctx.sessionSecret)
  if (user) req.user = user
  return user
}
