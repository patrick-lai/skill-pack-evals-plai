import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createApp } from './app.ts'
import { log } from './log.ts'

function sessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET?.trim()
  if (fromEnv && fromEnv.length >= 16) return fromEnv
  const file = 'data/session-secret'
  if (existsSync(file)) return readFileSync(file, 'utf8').trim()
  mkdirSync('data', { recursive: true })
  const generated = randomBytes(32).toString('hex')
  writeFileSync(file, generated, { mode: 0o600 })
  log('info', 'session.secret.created', { path: file })
  return generated
}

const port = Number(process.env.PORT ?? 43124)
const host = process.env.HOST ?? '0.0.0.0'
const app = createApp({ sessionSecret: sessionSecret() })

app.listen(port, host, () => {
  log('info', 'server.listen', { host, port })
})
