import type { Express } from 'express';
import type Database from 'better-sqlite3';
import type { TaskStatus } from '@boardline/shared';
import { requireUser, sendError } from './http';
import {
  createTask,
  deleteTask,
  getTaskForUser,
  isBoardMember,
  placeTask,
  saveTaskFields,
} from './taskStore';
import { cleanDescription, cleanDueDate, cleanRequiredText, cleanStatus, isError } from './validate';

export function registerTaskRoutes(app: Express, db: Database.Database): void {
  app.post('/api/boards/:boardId/tasks', (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    const boardId = req.params.boardId;
    if (!isBoardMember(db, boardId, user.id)) return sendError(res, 404, 'Board not found.');

    const title = cleanRequiredText(req.body?.title, 140, 'Title is required.', 'Title must be 140 characters or fewer.');
    if (isError(title)) return sendError(res, 400, title.error);
    const description = cleanDescription(req.body?.description);
    if (isError(description)) return sendError(res, 400, description.error);
    const status = req.body?.status == null ? 'todo' : cleanStatus(req.body.status);
    if (isError(status)) return sendError(res, 400, status.error);
    const dueDate = cleanDueDate(req.body?.dueDate);
    if (isError(dueDate)) return sendError(res, 400, dueDate.error);
    const assignee = cleanAssignee(db, boardId, req.body?.assigneeId, false);
    if ('error' in assignee) return sendError(res, assignee.status, assignee.error);

    const task = createTask(db, {
      boardId,
      title,
      description,
      status,
      assigneeId: assignee.assigneeId,
      dueDate,
    });
    res.status(201).json(task);
  });

  app.patch('/api/tasks/:taskId', (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    const current = getTaskForUser(db, req.params.taskId, user.id);
    if (!current) return sendError(res, 404, 'Task not found.');

    let title = current.title;
    if ('title' in (req.body ?? {})) {
      const cleaned = cleanRequiredText(req.body.title, 140, 'Title is required.', 'Title must be 140 characters or fewer.');
      if (isError(cleaned)) return sendError(res, 400, cleaned.error);
      title = cleaned;
    }
    let description = current.description;
    if ('description' in (req.body ?? {})) {
      const cleaned = cleanDescription(req.body.description);
      if (isError(cleaned)) return sendError(res, 400, cleaned.error);
      description = cleaned;
    }
    let status: TaskStatus = current.status;
    if ('status' in (req.body ?? {})) {
      const cleaned = cleanStatus(req.body.status);
      if (isError(cleaned)) return sendError(res, 400, cleaned.error);
      status = cleaned;
    }
    let dueDate = current.due_date;
    if ('dueDate' in (req.body ?? {})) {
      const cleaned = cleanDueDate(req.body.dueDate);
      if (isError(cleaned)) return sendError(res, 400, cleaned.error);
      dueDate = cleaned;
    }
    let assigneeId = current.assignee_id;
    if ('assigneeId' in (req.body ?? {})) {
      const cleaned = cleanAssignee(db, current.board_id, req.body.assigneeId, true);
      if ('error' in cleaned) return sendError(res, cleaned.status, cleaned.error);
      assigneeId = cleaned.assigneeId;
    }
    let position: number | null = null;
    let positionProvided = false;
    if ('position' in (req.body ?? {})) {
      const value = req.body.position;
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        return sendError(res, 400, 'Position must be a whole number.');
      }
      position = value;
      positionProvided = true;
    }

    if (status !== current.status || positionProvided) {
      placeTask(db, current.id, status, positionProvided ? position : null);
    }
    const task = saveTaskFields(db, current.id, { title, description, assigneeId, dueDate });
    res.json(task);
  });

  app.delete('/api/tasks/:taskId', (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    const current = getTaskForUser(db, req.params.taskId, user.id);
    if (!current) return sendError(res, 404, 'Task not found.');
    deleteTask(db, current);
    res.status(204).end();
  });
}

function cleanAssignee(
  db: Database.Database,
  boardId: string,
  value: unknown,
  allowNull: boolean,
): { assigneeId: string | null } | { error: string; status: number } {
  if (value == null || value === '') {
    if (allowNull || value == null || value === '') return { assigneeId: null };
  }
  if (typeof value !== 'string') return { error: 'Assignee is not on this board.', status: 400 };
  if (!isBoardMember(db, boardId, value)) return { error: 'Assignee is not on this board.', status: 400 };
  return { assigneeId: value };
}
