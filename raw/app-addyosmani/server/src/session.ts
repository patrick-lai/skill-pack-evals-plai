import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { Response } from 'express'
import type { DatabaseSync } from 'node:sqlite'
import type { User } from '@bench/shared'
import { get, run } from './db.ts'

export const COOKIE_NAME = 'board_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14

export function signSession(id: string, secret: string): string {
  const sig = createHmac('sha256', secret).update(id).digest('base64url')
  return `${id}.${sig}`
}

export function unsignSession(token: string, secret: string): string | null {
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null
  const id = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = createHmac('sha256', secret).update(id).digest('base64url')
  const actualBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expected)
  if (actualBuf.length !== expectedBuf.length) return null
  if (!timingSafeEqual(actualBuf, expectedBuf)) return null
  return id
}

export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator === -1) continue
    const key = part.slice(0, separator).trim()
    if (key !== name) continue
    return decodeURIComponent(part.slice(separator + 1).trim())
  }
  return null
}

export function setSessionCookie(res: Response, token: string, secure: boolean): void {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${MAX_AGE_SECONDS}`,
  ]
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

export function clearSessionCookie(res: Response): void {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`)
}

export function createSession(db: DatabaseSync, userId: string, secret: string): string {
  const id = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + MAX_AGE_SECONDS * 1000).toISOString()
  run(db, 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)', id, userId, expires)
  return signSession(id, secret)
}

export function destroySession(db: DatabaseSync, token: string | null, secret: string): void {
  if (!token) return
  const id = unsignSession(token, secret)
  if (!id) return
  run(db, 'DELETE FROM sessions WHERE id = ?', id)
}

interface UserRow {
  id: string
  email: string
  name: string
}

export function userForToken(db: DatabaseSync, token: string | null, secret: string): User | undefined {
  if (!token) return undefined
  const id = unsignSession(token, secret)
  if (!id) return undefined
  const now = new Date().toISOString()
  const row = get<UserRow>(
    db,
    `SELECT u.id, u.email, u.name
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ?`,
    id,
    now,
  )
  if (!row) {
    run(db, 'DELETE FROM sessions WHERE id = ?', id)
    return undefined
  }
  return { id: row.id, email: row.email, name: row.name }
}
