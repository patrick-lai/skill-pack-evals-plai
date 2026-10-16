import { DatabaseSync } from 'node:sqlite'
import request from 'supertest'
import type { User } from '@bench/shared'
import { createApp } from '../src/app.ts'
import { migrate } from '../src/db.ts'

export function makeApp() {
  const db = new DatabaseSync(':memory:')
  migrate(db)
  const app = createApp({ db, sessionSecret: 'test-secret-value-which-is-long' })
  return { db, app }
}

export async function register(app: ReturnType<typeof makeApp>['app'], email: string, name = 'Ada Lovelace') {
  const agent = request.agent(app)
  const response = await agent.post('/api/auth/register').send({
    email,
    name,
    password: 'password123',
  })
  if (response.status !== 201) {
    throw new Error(`register failed: ${response.status} ${JSON.stringify(response.body)}`)
  }
  return { agent, user: response.body.user as User }
}
