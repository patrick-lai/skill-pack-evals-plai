import cookieParser from 'cookie-parser';
import express, {
  type ErrorRequestHandler,
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { clearSession, setSession, userFromRequest, type PublicUser } from './auth.ts';
import {
  addMember,
  authenticate,
  createBoard,
  createTask,
  createUser,
  deleteBoard,
  deleteTask,
  getBoard,
  listBoards,
  removeMember,
  updateBoard,
  updateTask,
} from './data.ts';
import { openDatabase, type DB } from './db.ts';
import { HttpError } from './errors.ts';
import {
  boardPatchSchema,
  boardSchema,
  loginSchema,
  memberSchema,
  registerSchema,
  taskCreateSchema,
  taskPatchSchema,
} from './schemas.ts';

type AuthedRequest = Request & { user: PublicUser };

function getDb(req: Request): DB {
  return req.app.locals.db as DB;
}

function parseBody<T>(schema: { safeParse: (body: unknown) => { success: true; data: T } | { success: false; error: { issues: { message: string }[] } } }, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(400, result.error.issues[0]?.message ?? 'Invalid request');
  }
  return result.data;
}

function route(fn: (req: Request, res: Response) => void) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      fn(req, res);
    } catch (error) {
      next(error);
    }
  };
}

function requireUser(req: Request, res: Response, next: NextFunction) {
  const user = userFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Sign in required' });
    return;
  }
  (req as AuthedRequest).user = user;
  next();
}

function actor(req: Request): PublicUser {
  return (req as AuthedRequest).user;
}

export function createApp(dbPath: string): Express {
  const db = openDatabase(dbPath);
  const app = express();
  app.disable('x-powered-by');
  app.locals.db = db;
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post(
    '/api/auth/register',
    route((req, res) => {
      const input = parseBody(registerSchema, req.body);
      const user = createUser(getDb(req), input);
      setSession(res, user.id);
      res.status(201).json({ user });
    }),
  );

  app.post(
    '/api/auth/login',
    route((req, res) => {
      const input = parseBody(loginSchema, req.body);
      const user = authenticate(getDb(req), input.email, input.password);
      setSession(res, user.id);
      res.json({ user });
    }),
  );

  app.post('/api/auth/logout', (_req, res) => {
    clearSession(res);
    res.status(204).end();
  });

  app.get('/api/auth/me', (req, res) => {
    const user = userFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'Sign in required' });
      return;
    }
    res.json({ user });
  });

  app.get(
    '/api/boards',
    requireUser,
    route((req, res) => {
      res.json({ boards: listBoards(getDb(req), actor(req).id) });
    }),
  );

  app.post(
    '/api/boards',
    requireUser,
    route((req, res) => {
      const input = parseBody(boardSchema, req.body);
      const board = createBoard(getDb(req), actor(req).id, input);
      res.status(201).json({ board });
    }),
  );

  app.get(
    '/api/boards/:boardId',
    requireUser,
    route((req, res) => {
      const board = getBoard(getDb(req), String(req.params.boardId), actor(req).id);
      res.json({ board });
    }),
  );

  app.patch(
    '/api/boards/:boardId',
    requireUser,
    route((req, res) => {
      const input = parseBody(boardPatchSchema, req.body);
      const board = updateBoard(getDb(req), String(req.params.boardId), actor(req).id, input);
      res.json({ board });
    }),
  );

  app.delete(
    '/api/boards/:boardId',
    requireUser,
    route((req, res) => {
      deleteBoard(getDb(req), String(req.params.boardId), actor(req).id);
      res.status(204).end();
    }),
  );

  app.post(
    '/api/boards/:boardId/members',
    requireUser,
    route((req, res) => {
      const input = parseBody(memberSchema, req.body);
      const member = addMember(getDb(req), String(req.params.boardId), actor(req).id, input.email);
      res.status(201).json({ member });
    }),
  );

  app.delete(
    '/api/boards/:boardId/members/:userId',
    requireUser,
    route((req, res) => {
      removeMember(
        getDb(req),
        String(req.params.boardId),
        actor(req).id,
        String(req.params.userId),
      );
      res.status(204).end();
    }),
  );

  app.post(
    '/api/boards/:boardId/tasks',
    requireUser,
    route((req, res) => {
      const input = parseBody(taskCreateSchema, req.body);
      const task = createTask(getDb(req), String(req.params.boardId), actor(req).id, input);
      res.status(201).json({ task });
    }),
  );

  app.patch(
    '/api/tasks/:taskId',
    requireUser,
    route((req, res) => {
      const input = parseBody(taskPatchSchema, req.body);
      const task = updateTask(getDb(req), String(req.params.taskId), actor(req).id, input);
      res.json({ task });
    }),
  );

  app.delete(
    '/api/tasks/:taskId',
    requireUser,
    route((req, res) => {
      deleteTask(getDb(req), String(req.params.taskId), actor(req).id);
      res.status(204).end();
    }),
  );

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Request body must be JSON' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  };
  app.use(errorHandler);

  return app;
}

export function closeApp(app: Express) {
  const db = app.locals.db as DB | undefined;
  db?.close();
}
