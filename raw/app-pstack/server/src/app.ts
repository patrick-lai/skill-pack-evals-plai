import {
  BoardIdSchema,
  BoardNameSchema,
  CreateTaskInputSchema,
  LoginInputSchema,
  MemberEmailSchema,
  MoveInputSchema,
  PublicUserSchema,
  RegisterInputSchema,
  TaskIdSchema,
  UpdateTaskInputSchema,
  applyMove,
  bodySetsStatus,
  firstIssue,
} from "@plank/shared";
import type { BoardId, PublicUser, TaskId } from "@plank/shared";
import type { z } from "zod";
import { Hono } from "hono";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  addMember,
  createSession,
  deleteBoard,
  deleteSession,
  deleteTask,
  findBoard,
  findTask,
  findUserByEmail,
  findUserBySession,
  insertBoard,
  insertTask,
  insertUser,
  isMember,
  isUniqueConstraint,
  listBoards,
  listMembers,
  listTasks,
  saveColumn,
  updateTask,
} from "./db.ts";
import type { Database } from "./db.ts";
import { hashPassword, verifyPassword } from "./passwords.ts";

const COOKIE = "plank_session";

function fail(status: ContentfulStatusCode, error: string): never {
  throw new HTTPException(status, { res: Response.json({ error }, { status }) });
}

function parseOrFail<Schema extends z.ZodTypeAny>(schema: Schema, body: unknown): z.output<Schema> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) fail(400, firstIssue(parsed.error));
  return parsed.data;
}

export function createApp(db: Database): Hono {
  const app = new Hono();

  app.onError((error, c) => {
    if (error instanceof HTTPException) return error.getResponse();
    console.error(error);
    return c.json({ error: "Something went wrong." }, 500);
  });

  function actor(c: Context): PublicUser {
    const token = getCookie(c, COOKIE);
    if (!token) fail(401, "Sign in first.");
    const user = findUserBySession(db, token);
    if (!user) fail(401, "Sign in first.");
    return user;
  }

  function sessionCookie(c: Parameters<typeof setCookie>[0], user: PublicUser): void {
    const token = createSession(db, user.id);
    setCookie(c, COOKIE, token, { httpOnly: true, sameSite: "Lax", path: "/" });
  }

  function boardFor(user: PublicUser, rawId: string) {
    const idParse = BoardIdSchema.safeParse(rawId);
    if (!idParse.success) fail(404, "That board is not on your account.");
    const boardId: BoardId = idParse.data;
    if (!isMember(db, boardId, user.id)) fail(404, "That board is not on your account.");
    const board = findBoard(db, boardId);
    if (!board) fail(404, "That board is not on your account.");
    return board;
  }

  function taskFor(user: PublicUser, rawId: string) {
    const idParse = TaskIdSchema.safeParse(rawId);
    if (!idParse.success) fail(404, "That task is not on your board.");
    const task = findTask(db, idParse.data as TaskId);
    if (!task || !isMember(db, task.boardId, user.id)) fail(404, "That task is not on your board.");
    return task;
  }

  function assertAssignee(boardId: BoardId, assigneeId: PublicUser["id"] | null): void {
    if (assigneeId && !isMember(db, boardId, assigneeId)) {
      fail(400, "Assignee must be on this board.");
    }
  }

  app.post("/api/auth/register", async (c) => {
    const input = parseOrFail(RegisterInputSchema, await readJson(c));
    try {
      const user = insertUser(db, {
        email: input.email,
        name: input.name,
        passwordHash: hashPassword(input.password),
      });
      sessionCookie(c, user);
      return c.json({ user }, 201);
    } catch (error) {
      if (isUniqueConstraint(error)) fail(409, "An account already uses that email.");
      throw error;
    }
  });

  app.post("/api/auth/login", async (c) => {
    const input = parseOrFail(LoginInputSchema, await readJson(c));
    const user = findUserByEmail(db, input.email);
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      fail(401, "Email or password is wrong.");
    }
    const publicUser = PublicUserSchema.parse(user);
    sessionCookie(c, publicUser);
    return c.json({ user: publicUser });
  });

  app.post("/api/auth/logout", (c) => {
    const token = getCookie(c, COOKIE);
    if (token) deleteSession(db, token);
    deleteCookie(c, COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  app.get("/api/auth/me", (c) => {
    const token = getCookie(c, COOKIE);
    const user = token ? findUserBySession(db, token) : null;
    return c.json({ user });
  });

  app.get("/api/boards", (c) => {
    const user = actor(c);
    return c.json({ boards: listBoards(db, user.id) });
  });

  app.post("/api/boards", async (c) => {
    const user = actor(c);
    const input = parseOrFail(BoardNameSchema, await readJson(c));
    const board = insertBoard(db, user.id, input.name);
    return c.json({ board }, 201);
  });

  app.get("/api/boards/:boardId", (c) => {
    const user = actor(c);
    const board = boardFor(user, c.req.param("boardId"));
    return c.json({
      board,
      members: listMembers(db, board.id),
      tasks: listTasks(db, board.id),
    });
  });

  app.delete("/api/boards/:boardId", (c) => {
    const user = actor(c);
    const board = boardFor(user, c.req.param("boardId"));
    if (board.ownerId !== user.id) fail(403, "Only the owner can delete this board.");
    deleteBoard(db, board.id);
    return c.json({ ok: true });
  });

  app.post("/api/boards/:boardId/members", async (c) => {
    const user = actor(c);
    const board = boardFor(user, c.req.param("boardId"));
    const input = parseOrFail(MemberEmailSchema, await readJson(c));
    const teammate = findUserByEmail(db, input.email);
    if (!teammate) fail(404, "No account uses that email.");
    addMember(db, board.id, teammate.id);
    return c.json({ members: listMembers(db, board.id) });
  });

  app.post("/api/boards/:boardId/tasks", async (c) => {
    const user = actor(c);
    const board = boardFor(user, c.req.param("boardId"));
    const input = parseOrFail(CreateTaskInputSchema, await readJson(c));
    assertAssignee(board.id, input.assigneeId);
    const task = insertTask(db, board.id, input);
    return c.json({ task }, 201);
  });

  app.patch("/api/tasks/:taskId", async (c) => {
    const user = actor(c);
    const task = taskFor(user, c.req.param("taskId"));
    const body = await readJson(c);
    if (bodySetsStatus(body)) fail(400, "Change status by moving the task.");
    const input = parseOrFail(UpdateTaskInputSchema, body);
    assertAssignee(task.boardId, input.assigneeId);
    updateTask(db, task.id, input);
    const saved = findTask(db, task.id);
    if (!saved) fail(404, "That task is not on your board.");
    return c.json({ task: saved });
  });

  app.post("/api/tasks/:taskId/move", async (c) => {
    const user = actor(c);
    const task = taskFor(user, c.req.param("taskId"));
    const input = parseOrFail(MoveInputSchema, await readJson(c));
    const next = applyMove(listTasks(db, task.boardId), { taskId: task.id, ...input });
    saveColumn(db, next, input.status);
    return c.json({ tasks: listTasks(db, task.boardId) });
  });

  app.delete("/api/tasks/:taskId", (c) => {
    const user = actor(c);
    const task = taskFor(user, c.req.param("taskId"));
    deleteTask(db, task.id);
    return c.json({ ok: true });
  });

  return app;
}

async function readJson(c: { req: { json: () => Promise<unknown> } }): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}
