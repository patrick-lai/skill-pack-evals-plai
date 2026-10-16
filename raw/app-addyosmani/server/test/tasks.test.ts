import { describe, expect, it } from 'vitest'
import type { Task } from '@bench/shared'
import { makeApp, register } from './helpers.ts'

describe('tasks', () => {
  it('creates a task in To do and edits its fields', async () => {
    const { app } = makeApp()
    const ada = await register(app, 'ada@example.com')
    const boardId = (await ada.agent.post('/api/boards').send({ name: 'Launch' })).body.board.id as string

    const created = await ada.agent.post(`/api/boards/${boardId}/tasks`).send({ title: 'Write the spec' })
    expect(created.status).toBe(201)
    expect(created.body.task).toMatchObject({
      title: 'Write the spec',
      description: '',
      status: 'todo',
      assigneeId: ada.user.id === created.body.task.assigneeId ? ada.user.id : null,
      dueDate: null,
      position: 0,
    })
    expect(created.body.task.assigneeId).toBeNull()

    const updated = await ada.agent.patch(`/api/boards/${boardId}/tasks/${created.body.task.id}`).send({
      description: 'Cover auth, boards, and tasks.',
      assigneeId: ada.user.id,
      dueDate: '2026-10-20',
    })
    expect(updated.status).toBe(200)
    expect(updated.body.task.description).toBe('Cover auth, boards, and tasks.')
    expect(updated.body.task.assigneeId).toBe(ada.user.id)
    expect(updated.body.task.dueDate).toBe('2026-10-20')
  })

  it('rejects an assignee who is not on the board and an impossible date', async () => {
    const { app } = makeApp()
    const ada = await register(app, 'ada@example.com')
    const grace = await register(app, 'grace@example.com', 'Grace Hopper')
    const boardId = (await ada.agent.post('/api/boards').send({ name: 'Launch' })).body.board.id as string

    const outsider = await ada.agent.post(`/api/boards/${boardId}/tasks`).send({
      title: 'Pair',
      assigneeId: grace.user.id,
    })
    expect(outsider.status).toBe(422)

    const badDate = await ada.agent.post(`/api/boards/${boardId}/tasks`).send({
      title: 'Pair',
      dueDate: '2026-02-31',
    })
    expect(badDate.status).toBe(422)

    const badStatus = await ada.agent.post(`/api/boards/${boardId}/tasks`).send({
      title: 'Pair',
      status: 'later',
    })
    expect(badStatus.status).toBe(422)
  })

  it('moves a card between columns and keeps order', async () => {
    const { app } = makeApp()
    const ada = await register(app, 'ada@example.com')
    const boardId = (await ada.agent.post('/api/boards').send({ name: 'Launch' })).body.board.id as string
    const titles = ['Alpha', 'Beta', 'Gamma']
    const ids: string[] = []
    for (const title of titles) {
      const created = await ada.agent.post(`/api/boards/${boardId}/tasks`).send({ title })
      ids.push(created.body.task.id as string)
    }

    const moved = await ada.agent.patch(`/api/boards/${boardId}/tasks/${ids[2]}`).send({
      status: 'doing',
      position: 0,
    })
    expect(moved.status).toBe(200)
    expect(moved.body.task.status).toBe('doing')
    expect(moved.body.task.position).toBe(0)

    const reordered = await ada.agent.patch(`/api/boards/${boardId}/tasks/${ids[0]}`).send({
      status: 'todo',
      position: 1,
    })
    expect(reordered.status).toBe(200)

    const listed = await ada.agent.get(`/api/boards/${boardId}/tasks?pageSize=50`)
    const tasks = listed.body.data as Task[]
    const todo = tasks.filter((task) => task.status === 'todo').sort((a, b) => a.position - b.position)
    const doing = tasks.filter((task) => task.status === 'doing')
    expect(todo.map((task) => task.title)).toEqual(['Beta', 'Alpha'])
    expect(todo.map((task) => task.position)).toEqual([0, 1])
    expect(doing.map((task) => task.title)).toEqual(['Gamma'])
  })

  it('hides tasks from people who are not members', async () => {
    const { app } = makeApp()
    const ada = await register(app, 'ada@example.com')
    const grace = await register(app, 'grace@example.com', 'Grace Hopper')
    const boardId = (await ada.agent.post('/api/boards').send({ name: 'Launch' })).body.board.id as string
    const taskId = (await ada.agent.post(`/api/boards/${boardId}/tasks`).send({ title: 'Secret' })).body.task.id

    const hidden = await grace.agent.get(`/api/boards/${boardId}/tasks`)
    expect(hidden.status).toBe(404)
    const blocked = await grace.agent.patch(`/api/boards/${boardId}/tasks/${taskId}`).send({ title: 'Stolen' })
    expect(blocked.status).toBe(404)
  })

  it('deletes a task and clears an assignee who leaves the board', async () => {
    const { app } = makeApp()
    const ada = await register(app, 'ada@example.com')
    const grace = await register(app, 'grace@example.com', 'Grace Hopper')
    const boardId = (await ada.agent.post('/api/boards').send({ name: 'Launch' })).body.board.id as string
    await ada.agent.post(`/api/boards/${boardId}/members`).send({ email: 'grace@example.com' })
    const taskId = (
      await ada.agent.post(`/api/boards/${boardId}/tasks`).send({ title: 'Review', assigneeId: grace.user.id })
    ).body.task.id as string

    await ada.agent.delete(`/api/boards/${boardId}/members/${grace.user.id}`)
    const after = await ada.agent.get(`/api/boards/${boardId}/tasks`)
    expect(after.body.data[0].assigneeId).toBeNull()

    const removed = await ada.agent.delete(`/api/boards/${boardId}/tasks/${taskId}`)
    expect(removed.status).toBe(204)
    const empty = await ada.agent.get(`/api/boards/${boardId}/tasks`)
    expect(empty.body.data).toEqual([])
    expect(empty.body.pagination.totalItems).toBe(0)
  })
})
