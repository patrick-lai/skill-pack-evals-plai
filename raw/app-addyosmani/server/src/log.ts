type Level = 'info' | 'warn' | 'error'

const REDACTED = new Set(['password', 'passwordHash', 'password_hash', 'session', 'cookie', 'authorization'])

export function log(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    safe[key] = REDACTED.has(key) ? '[redacted]' : value
  }
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, event, ...safe }))
}
