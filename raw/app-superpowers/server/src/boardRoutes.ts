import type { Express } from 'express';
import type Database from 'better-sqlite3';
import { addMember, createBoard, deleteBoard, getBoard, listBoards, membership, removeMember, renameBoard } from './boards';
import { requireUser, sendError } from './http';
import { cleanEmail, cleanRequiredText, isError } from './validate';

export function registerBoardRoutes(app: Express, db: Database.Database): void {
  app.get('/api/boards', (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    res.json({ boards: listBoards(db, user.id) });
  });

  app.post('/api/boards', (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    const name = cleanRequiredText(
      req.body?.name,
      80,
      'Board name is required.',
      'Board name must be 80 characters or fewer.',
    );
    if (isError(name)) return sendError(res, 400, name.error);
    res.status(201).json(createBoard(db, user.id, name));
  });

  app.get('/api/boards/:boardId', (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    const board = getBoard(db, req.params.boardId, user.id);
    if (!board) return sendError(res, 404, 'Board not found.');
    res.json(board);
  });

  app.patch('/api/boards/:boardId', (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    if (!requireOwner(db, req.params.boardId, user.id, res)) return;
    const name = cleanRequiredText(
      req.body?.name,
      80,
      'Board name is required.',
      'Board name must be 80 characters or fewer.',
    );
    if (isError(name)) return sendError(res, 400, name.error);
    res.json(renameBoard(db, req.params.boardId, user.id, name));
  });

  app.delete('/api/boards/:boardId', (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    if (!requireOwner(db, req.params.boardId, user.id, res)) return;
    deleteBoard(db, req.params.boardId);
    res.status(204).end();
  });

  app.post('/api/boards/:boardId/members', (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    if (!requireOwner(db, req.params.boardId, user.id, res)) return;
    const email = cleanEmail(req.body?.email);
    if (!email) return sendError(res, 400, 'Enter a valid email.');
    const result = addMember(db, req.params.boardId, email);
    if (!result.ok) return sendError(res, result.status, result.error);
    res.status(201).json(result.member);
  });

  app.delete('/api/boards/:boardId/members/:userId', (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    if (!requireOwner(db, req.params.boardId, user.id, res)) return;
    const result = removeMember(db, req.params.boardId, req.params.userId);
    if (!result.ok) return sendError(res, result.status, result.error);
    res.status(204).end();
  });
}

function requireOwner(
  db: Database.Database,
  boardId: string,
  userId: string,
  res: Parameters<typeof sendError>[0],
): boolean {
  const member = membership(db, boardId, userId);
  if (!member) {
    sendError(res, 404, 'Board not found.');
    return false;
  }
  if (member.role !== 'owner') {
    sendError(res, 403, 'Only the owner can do that.');
    return false;
  }
  return true;
}
