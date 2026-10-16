import { randomUUID } from 'node:crypto';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import type Database from 'better-sqlite3';
import { sendError, requireUser, type AppRequest } from './http';
import { hashPassword, verifyPassword } from './passwords';
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  readCookie,
  setSessionCookie,
  userFromRequest,
} from './sessions';
import { getUserByEmail, insertUser, publicUser } from './users';
import { registerBoardRoutes } from './boardRoutes';
import { registerTaskRoutes } from './taskRoutes';
import { cleanEmail, cleanPassword, cleanRequiredText, isError } from './validate';

export function createApp(db: Database.Database): Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use((req, _res, next) => {
    (req as AppRequest).user = userFromRequest(db, req);
    next();
  });

  app.post('/api/auth/register', (req, res) => {
    const name = cleanRequiredText(req.body?.name, 80, 'Name is required.', 'Name must be 80 characters or fewer.');
    if (isError(name)) return sendError(res, 400, name.error);
    const email = cleanEmail(req.body?.email);
    if (!email) return sendError(res, 400, 'Enter a valid email.');
    const password = cleanPassword(req.body?.password);
    if (isError(password)) return sendError(res, 400, password.error);

    const user = { id: randomUUID(), email, name, createdAt: new Date().toISOString() };
    try {
      insertUser(db, { ...user, passwordHash: hashPassword(password) });
    } catch (error) {
      if (isUnique(error)) return sendError(res, 409, 'An account with that email already exists.');
      throw error;
    }
    setSessionCookie(res, createSession(db, user.id));
    res.status(201).json({ user: publicUser(user) });
  });

  app.post('/api/auth/login', (req, res) => {
    const email = cleanEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const row = email ? getUserByEmail(db, email) : undefined;
    if (!row || !verifyPassword(password, row.password_hash)) {
      return sendError(res, 401, 'Email or password is incorrect.');
    }
    setSessionCookie(res, createSession(db, row.id));
    res.json({ user: publicUser(row) });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = readCookie(req.headers.cookie);
    if (token) deleteSession(db, token);
    clearSessionCookie(res);
    res.status(204).end();
  });

  app.get('/api/auth/me', (req, res) => {
    const user = requireUser(req as AppRequest, res);
    if (!user) return;
    res.json({ user });
  });

  registerBoardRoutes(app, db);
  registerTaskRoutes(app, db);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError) {
      res.status(400).json({ error: 'Request body must be JSON.' });
      return;
    }
    res.status(500).json({ error: 'Something went wrong.' });
  });

  return app;
}

function isUnique(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'SQLITE_CONSTRAINT_UNIQUE';
}
