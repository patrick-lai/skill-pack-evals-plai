import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import type { BoardSummary } from '@bench/shared'
import { boardDetail, requireMember, requireOwner } from '../access.ts'
import type { AppContext } from '../context.ts'
import { all, get, run, transaction } from '../db.ts'
import { HttpError, pageResult, parseBody, wrap } from '../http.ts'
import { log } from '../log.ts'
import { boardNameSchema, inviteSchema, pageSchema } from '../validate.ts'

interface CountRow {
  n: number
}

export function boardsRouter(ctx: AppContext): Router {
  const router = Router()

  router.get(
    '/',
    wrap(async (req, res) => {
      const page = parseBody(pageSchema, req.query)
      const user = req.user!
      const total = get<CountRow>(
        ctx.db,
        `SELECT COUNT(*) AS n FROM board_members WHERE user_id = ?`,
        user.id,
      )
      const rows = all<BoardSummary>(
        ctx.db,
        `SELECT b.id, b.name, b.owner_id AS ownerId, b.created_at AS createdAt, m.role,
                (SELECT COUNT(*) FROM board_members c WHERE c.board_id = b.id) AS memberCount
         FROM boards b
         JOIN board_members m ON m.board_id = b.id AND m.user_id = ?
         ORDER BY b.created_at DESC
         LIMIT ? OFFSET ?`,
        user.id,
        page.pageSize,
        (page.page - 1) * page.pageSize,
      ).map((row) => ({ ...row, memberCount: Number(row.memberCount) }))
      res.json(pageResult(rows, Number(total?.n ?? 0), page.page, page.pageSize))
    }),
  )

  router.post(
    '/',
    wrap(async (req, res) => {
      const input = parseBody(boardNameSchema, req.body)
      const user = req.user!
      const id = randomUUID()
      const now = new Date().toISOString()
      transaction(ctx.db, () => {
        run(ctx.db, 'INSERT INTO boards (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)', id, input.name, user.id, now)
        run(
          ctx.db,
          'INSERT INTO board_members (board_id, user_id, role, created_at) VALUES (?, ?, ?, ?)',
          id,
          user.id,
          'owner',
          now,
        )
      })
      log('info', 'board.create', { userId: user.id, boardId: id })
      const board = boardDetail(ctx.db, requireMember(ctx.db, id, user.id))
      res.status(201).json({ board })
    }),
  )

  router.get(
    '/:boardId',
    wrap(async (req, res) => {
      const board = requireMember(ctx.db, req.params.boardId, req.user!.id)
      res.json({ board: boardDetail(ctx.db, board) })
    }),
  )

  router.patch(
    '/:boardId',
    wrap(async (req, res) => {
      const input = parseBody(boardNameSchema, req.body)
      const board = requireOwner(ctx.db, req.params.boardId, req.user!.id)
      run(ctx.db, 'UPDATE boards SET name = ? WHERE id = ?', input.name, board.id)
      res.json({ board: boardDetail(ctx.db, requireMember(ctx.db, board.id, req.user!.id)) })
    }),
  )

  router.delete(
    '/:boardId',
    wrap(async (req, res) => {
      const board = requireOwner(ctx.db, req.params.boardId, req.user!.id)
      run(ctx.db, 'DELETE FROM boards WHERE id = ?', board.id)
      log('info', 'board.delete', { userId: req.user!.id, boardId: board.id })
      res.status(204).end()
    }),
  )

  router.post(
    '/:boardId/members',
    wrap(async (req, res) => {
      const input = parseBody(inviteSchema, req.body)
      const board = requireOwner(ctx.db, req.params.boardId, req.user!.id)
      const account = get<{ id: string; email: string; name: string }>(
        ctx.db,
        'SELECT id, email, name FROM users WHERE email = ?',
        input.email,
      )
      if (!account) throw new HttpError(404, 'NOT_FOUND', 'No account with that email.')
      const already = get<{ user_id: string }>(
        ctx.db,
        'SELECT user_id FROM board_members WHERE board_id = ? AND user_id = ?',
        board.id,
        account.id,
      )
      if (already) throw new HttpError(409, 'ALREADY_MEMBER', 'That person is already on the board.')
      run(
        ctx.db,
        'INSERT INTO board_members (board_id, user_id, role, created_at) VALUES (?, ?, ?, ?)',
        board.id,
        account.id,
        'member',
        new Date().toISOString(),
      )
      log('info', 'board.member.add', { userId: req.user!.id, boardId: board.id, memberId: account.id })
      res.status(201).json({ member: { ...account, role: 'member' as const } })
    }),
  )

  router.delete(
    '/:boardId/members/:userId',
    wrap(async (req, res) => {
      const board = requireOwner(ctx.db, req.params.boardId, req.user!.id)
      if (!zUuid(req.params.userId)) throw new HttpError(404, 'NOT_FOUND', 'Member not found.')
      if (req.params.userId === board.ownerId) {
        throw new HttpError(403, 'FORBIDDEN', 'The owner stays on the board.')
      }
      const member = get<{ user_id: string }>(
        ctx.db,
        'SELECT user_id FROM board_members WHERE board_id = ? AND user_id = ?',
        board.id,
        req.params.userId,
      )
      if (!member) throw new HttpError(404, 'NOT_FOUND', 'Member not found.')
      transaction(ctx.db, () => {
        run(ctx.db, 'UPDATE tasks SET assignee_id = NULL WHERE board_id = ? AND assignee_id = ?', board.id, req.params.userId)
        run(ctx.db, 'DELETE FROM board_members WHERE board_id = ? AND user_id = ?', board.id, req.params.userId)
      })
      log('info', 'board.member.remove', { userId: req.user!.id, boardId: board.id, memberId: req.params.userId })
      res.status(204).end()
    }),
  )

  return router
}

function zUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
