import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { makeApp, register } from './helpers.ts'

describe('boards', () => {
  it('creates a board and lists it for the owner only', async () => {
    const { app } = makeApp()
    const ada = await register(app, 'ada@example.com')
    const grace = await register(app, 'grace@example.com', 'Grace Hopper')

    const created = await ada.agent.post('/api/boards').send({ name: 'Launch' })
    expect(created.status).toBe(201)
    expect(created.body.board.name).toBe('Launch')
    expect(created.body.board.role).toBe('owner')
    expect(created.body.board.members).toHaveLength(1)

    const adaList = await ada.agent.get('/api/boards')
    expect(adaList.body.data.map((board: { name: string }) => board.name)).toEqual(['Launch'])

    const hidden = await grace.agent.get(`/api/boards/${created.body.board.id}`)
    expect(hidden.status).toBe(404)
  })

  it('lets the owner invite an existing account', async () => {
    const { app } = makeApp()
    const ada = await register(app, 'ada@example.com')
    const grace = await register(app, 'grace@example.com', 'Grace Hopper')
    const created = await ada.agent.post('/api/boards').send({ name: 'Launch' })
    const boardId = created.body.board.id as string

    const missing = await ada.agent.post(`/api/boards/${boardId}/members`).send({ email: 'nope@example.com' })
    expect(missing.status).toBe(404)

    const invited = await ada.agent.post(`/api/boards/${boardId}/members`).send({ email: 'Grace@example.com' })
    expect(invited.status).toBe(201)
    expect(invited.body.member.role).toBe('member')

    const seen = await grace.agent.get(`/api/boards/${boardId}`)
    expect(seen.status).toBe(200)
    expect(seen.body.board.members).toHaveLength(2)

    const forbidden = await grace.agent.delete(`/api/boards/${boardId}`)
    expect(forbidden.status).toBe(403)

    const removed = await ada.agent.delete(`/api/boards/${boardId}/members/${grace.user.id}`)
    expect(removed.status).toBe(204)
    const gone = await grace.agent.get(`/api/boards/${boardId}`)
    expect(gone.status).toBe(404)
  })

  it('lets only the owner rename or delete a board', async () => {
    const { app } = makeApp()
    const ada = await register(app, 'ada@example.com')
    const created = await ada.agent.post('/api/boards').send({ name: 'Launch' })
    const boardId = created.body.board.id as string

    const renamed = await ada.agent.patch(`/api/boards/${boardId}`).send({ name: 'Launch week' })
    expect(renamed.status).toBe(200)
    expect(renamed.body.board.name).toBe('Launch week')

    const deleted = await ada.agent.delete(`/api/boards/${boardId}`)
    expect(deleted.status).toBe(204)
    const missing = await ada.agent.get(`/api/boards/${boardId}`)
    expect(missing.status).toBe(404)
  })

  it('rejects an unauthenticated create', async () => {
    const { app } = makeApp()
    const response = await request(app).post('/api/boards').send({ name: 'Launch' })
    expect(response.status).toBe(401)
  })
})
