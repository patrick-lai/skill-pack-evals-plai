import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { planMove, type Status, type Task } from '@bench/shared'
import { assertAssignee, listTasks, requireMember, toTask } from '../access.ts'
import type { AppContext } from '../context.ts'
import { get, run, transaction } from '../db.ts'
import { HttpError, pageResult, parseBody, wrap } from '../http.ts'
import { createTaskSchema, pageSchema, updateTaskSchema } from '../validate.ts'

interface CountRow {
  n: number
}

export function tasksRouter(ctx: AppContext): Router {
  const router = Router({ mergeParams: true })

  router.get(
    '/',
    wrap(async (req, res) => {
      const page = parseBody(pageSchema, req.query)
      const board = requireMember(ctx.db, req.params.boardId, req.user!.id)
      const total = get<CountRow>(ctx.db, 'SELECT COUNT(*) AS n FROM tasks WHERE board_id = ?', board.id)
      const tasks = listTasks(ctx.db, board.id)
        .sort(byColumn)
        .slice((page.page - 1) * page.pageSize, page.page * page.pageSize)
      res.json(pageResult(tasks, Number(total?.n ?? 0), page.page, page.pageSize))
    }),
  )

  router.post(
    '/',
    wrap(async (req, res) => {
      const input = parseBody(createTaskSchema, req.body)
      const board = requireMember(ctx.db, req.params.boardId, req.user!.id)
      assertAssignee(ctx.db, board.id, input.assigneeId)
      const position = nextPosition(ctx, board.id, input.status)
      const now = new Date().toISOString()
      const id = randomUUID()
      run(
        ctx.db,
        `INSERT INTO tasks
          (id, board_id, title, description, status, assignee_id, due_date, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        board.id,
        input.title,
        input.description,
        input.status,
        input.assigneeId,
        input.dueDate,
        position,
        now,
        now,
      )
      res.status(201).json({ task: mustTask(ctx, board.id, id) })
    }),
  )

  router.patch(
    '/:taskId',
    wrap(async (req, res) => {
      const input = parseBody(updateTaskSchema, req.body)
      const board = requireMember(ctx.db, req.params.boardId, req.user!.id)
      const current = findTask(ctx, board.id, req.params.taskId)
      if (input.assigneeId !== undefined) assertAssignee(ctx.db, board.id, input.assigneeId)

      const moves = input.status !== undefined || input.position !== undefined
      if (moves) {
        const status = input.status ?? current.status
        const index =
          input.position ??
          (input.status && input.status !== current.status ? countInStatus(ctx, board.id, status) : current.position)
        const planned = planMove(listTasks(ctx.db, board.id), current.id, status, index)
        const now = new Date().toISOString()
        transaction(ctx.db, () => {
          for (const task of planned) {
            run(ctx.db, 'UPDATE tasks SET status = ?, position = ? WHERE id = ? AND board_id = ?', task.status, task.position, task.id, board.id)
          }
          run(
            ctx.db,
            `UPDATE tasks
             SET title = ?, description = ?, assignee_id = ?, due_date = ?, updated_at = ?
             WHERE id = ? AND board_id = ?`,
            input.title ?? current.title,
            input.description ?? current.description,
            input.assigneeId === undefined ? current.assigneeId : input.assigneeId,
            input.dueDate === undefined ? current.dueDate : input.dueDate,
            now,
            current.id,
            board.id,
          )
        })
      } else {
        run(
          ctx.db,
          `UPDATE tasks
           SET title = ?, description = ?, assignee_id = ?, due_date = ?, updated_at = ?
           WHERE id = ? AND board_id = ?`,
          input.title ?? current.title,
          input.description ?? current.description,
          input.assigneeId === undefined ? current.assigneeId : input.assigneeId,
          input.dueDate === undefined ? current.dueDate : input.dueDate,
          new Date().toISOString(),
          current.id,
          board.id,
        )
      }

      res.json({ task: mustTask(ctx, board.id, current.id) })
    }),
  )

  router.delete(
    '/:taskId',
    wrap(async (req, res) => {
      const board = requireMember(ctx.db, req.params.boardId, req.user!.id)
      const task = findTask(ctx, board.id, req.params.taskId)
      const remaining = listTasks(ctx.db, board.id).filter((item) => item.id !== task.id)
      transaction(ctx.db, () => {
        run(ctx.db, 'DELETE FROM tasks WHERE id = ? AND board_id = ?', task.id, board.id)
        for (const status of ['todo', 'doing', 'done'] as const) {
          const column = remaining.filter((item) => item.status === status).sort(byColumn)
          column.forEach((item, position) => {
            run(ctx.db, 'UPDATE tasks SET position = ? WHERE id = ?', position, item.id)
          })
        }
      })
      res.status(204).end()
    }),
  )

  return router
}

function byColumn(a: Task, b: Task): number {
  const order: Record<Status, number> = { todo: 0, doing: 1, done: 2 }
  return order[a.status] - order[b.status] || a.position - b.position || a.id.localeCompare(b.id)
}

function nextPosition(ctx: AppContext, boardId: string, status: Status): number {
  const row = get<{ n: number | null }>(
    ctx.db,
    'SELECT MAX(position) AS n FROM tasks WHERE board_id = ? AND status = ?',
    boardId,
    status,
  )
  return row?.n == null ? 0 : Number(row.n) + 1
}

function countInStatus(ctx: AppContext, boardId: string, status: Status): number {
  const row = get<{ n: number }>(
    ctx.db,
    'SELECT COUNT(*) AS n FROM tasks WHERE board_id = ? AND status = ?',
    boardId,
    status,
  )
  return Number(row?.n ?? 0)
}

function findTask(ctx: AppContext, boardId: string, taskId: string): Task {
  if (!/^[0-9a-f-]{36}$/i.test(taskId)) throw new HttpError(404, 'NOT_FOUND', 'Task not found.')
  const row = get<Parameters<typeof toTask>[0]>(
    ctx.db,
    `SELECT id, board_id, title, description, status, assignee_id, due_date, position, created_at, updated_at
     FROM tasks WHERE id = ? AND board_id = ?`,
    taskId,
    boardId,
  )
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Task not found.')
  return toTask(row)
}

function mustTask(ctx: AppContext, boardId: string, taskId: string): Task {
  return findTask(ctx, boardId, taskId)
}
