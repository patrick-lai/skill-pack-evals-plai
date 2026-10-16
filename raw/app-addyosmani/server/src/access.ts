import type { BoardDetail, BoardSummary, Member, Status, Task } from '@bench/shared'
import type { DatabaseSync } from 'node:sqlite'
import { z } from 'zod'
import { all, get } from './db.ts'
import { HttpError } from './http.ts'

interface BoardRow {
  id: string
  name: string
  ownerId: string
  role: 'owner' | 'member'
  memberCount: number
  createdAt: string
}

interface MemberRow {
  id: string
  email: string
  name: string
  role: 'owner' | 'member'
}

interface TaskRow {
  id: string
  board_id: string
  title: string
  description: string
  status: Status
  assignee_id: string | null
  due_date: string | null
  position: number
  created_at: string
  updated_at: string
}

const uuid = z.string().uuid()

export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    description: row.description,
    status: row.status,
    assigneeId: row.assignee_id,
    dueDate: row.due_date,
    position: Number(row.position),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function requireMember(db: DatabaseSync, boardId: string, userId: string): BoardRow {
  if (!uuid.safeParse(boardId).success) {
    throw new HttpError(404, 'NOT_FOUND', 'Board not found.')
  }
  const row = get<BoardRow>(
    db,
    `SELECT b.id, b.name, b.owner_id AS ownerId, b.created_at AS createdAt, m.role,
            (SELECT COUNT(*) FROM board_members c WHERE c.board_id = b.id) AS memberCount
     FROM boards b
     JOIN board_members m ON m.board_id = b.id AND m.user_id = ?
     WHERE b.id = ?`,
    userId,
    boardId,
  )
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Board not found.')
  return { ...row, memberCount: Number(row.memberCount) }
}

export function requireOwner(db: DatabaseSync, boardId: string, userId: string): BoardRow {
  const board = requireMember(db, boardId, userId)
  if (board.role !== 'owner') {
    throw new HttpError(403, 'FORBIDDEN', 'Only the owner can do that.')
  }
  return board
}

export function boardDetail(db: DatabaseSync, board: BoardRow): BoardDetail {
  const members = all<MemberRow>(
    db,
    `SELECT u.id, u.email, u.name, m.role
     FROM board_members m
     JOIN users u ON u.id = m.user_id
     WHERE m.board_id = ?
     ORDER BY CASE m.role WHEN 'owner' THEN 0 ELSE 1 END, u.name COLLATE NOCASE`,
    board.id,
  ).map((member): Member => ({ ...member }))
  const summary: BoardSummary = {
    id: board.id,
    name: board.name,
    ownerId: board.ownerId,
    role: board.role,
    memberCount: board.memberCount,
    createdAt: board.createdAt,
  }
  return { ...summary, members }
}

export function listTasks(db: DatabaseSync, boardId: string): Task[] {
  return all<TaskRow>(
    db,
    `SELECT id, board_id, title, description, status, assignee_id, due_date, position, created_at, updated_at
     FROM tasks WHERE board_id = ?`,
    boardId,
  ).map(toTask)
}

export function assertAssignee(db: DatabaseSync, boardId: string, assigneeId: string | null): void {
  if (assigneeId === null) return
  const member = get<{ user_id: string }>(
    db,
    'SELECT user_id FROM board_members WHERE board_id = ? AND user_id = ?',
    boardId,
    assigneeId,
  )
  if (!member) throw new HttpError(422, 'VALIDATION_ERROR', 'Assignee must be a member of this board.')
}
