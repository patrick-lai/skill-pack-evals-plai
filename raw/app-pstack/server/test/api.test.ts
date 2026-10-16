import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { openDatabase } from "../src/db.ts";
import type { Database } from "../src/db.ts";
import type { Hono } from "hono";

type Json = Record<string, unknown> | null;

function harness(): { app: Hono; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "plank-"));
  const db: Database = openDatabase(join(dir, "test.sqlite"));
  return {
    app: createApp(db),
    cleanup: () => {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

async function call(
  app: Hono,
  path: string,
  options: { method?: string; body?: unknown; cookie?: string } = {},
): Promise<{ status: number; data: Json; cookie: string }> {
  const headers = new Headers();
  if (options.body !== undefined) headers.set("content-type", "application/json");
  if (options.cookie) headers.set("cookie", options.cookie);
  const response = await app.request(path, {
    method: options.method ?? (options.body === undefined ? "GET" : "POST"),
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const setCookie = response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  const text = await response.text();
  return {
    status: response.status,
    data: text ? (JSON.parse(text) as Json) : null,
    cookie: setCookie || options.cookie || "",
  };
}

describe("board API", () => {
  let cleanup = () => {};
  afterEach(() => cleanup());

  it("registers, signs in, and keeps a session cookie", async () => {
    const { app, cleanup: done } = harness();
    cleanup = done;

    const created = await call(app, "/api/auth/register", {
      body: { email: "Ada@Example.com", name: "Ada Lovelace", password: "correct horse" },
    });
    expect(created.status).toBe(201);
    expect(created.data).toMatchObject({ user: { email: "ada@example.com", name: "Ada Lovelace" } });
    expect(created.cookie).toContain("plank_session=");

    const me = await call(app, "/api/auth/me", { cookie: created.cookie });
    expect(me.status).toBe(200);
    expect(me.data).toMatchObject({ user: { name: "Ada Lovelace" } });

    const again = await call(app, "/api/auth/register", {
      body: { email: "ada@example.com", name: "Ada", password: "correct horse" },
    });
    expect(again.status).toBe(409);
    expect(again.data).toEqual({ error: "An account already uses that email." });

    await call(app, "/api/auth/logout", { method: "POST", cookie: created.cookie });
    const signedOut = await call(app, "/api/auth/me", { cookie: created.cookie });
    expect(signedOut.status).toBe(200);
    expect(signedOut.data).toEqual({ user: null });

    const bad = await call(app, "/api/auth/login", {
      body: { email: "ada@example.com", password: "wrong password" },
    });
    expect(bad.status).toBe(401);
    expect(bad.data).toEqual({ error: "Email or password is wrong." });

    const good = await call(app, "/api/auth/login", {
      body: { email: "ada@example.com", password: "correct horse" },
    });
    expect(good.status).toBe(200);
    expect(good.data).toMatchObject({ user: { email: "ada@example.com" } });
  });

  it("hides a board from someone who is not a member, then shares it", async () => {
    const { app, cleanup: done } = harness();
    cleanup = done;

    const ada = await call(app, "/api/auth/register", {
      body: { email: "ada@example.com", name: "Ada Lovelace", password: "correct horse" },
    });
    const byron = await call(app, "/api/auth/register", {
      body: { email: "byron@example.com", name: "Ada Byron", password: "correct horse" },
    });

    const created = await call(app, "/api/boards", {
      cookie: ada.cookie,
      body: { name: "Launch" },
    });
    expect(created.status).toBe(201);
    const boardId = (created.data?.board as { id: string }).id;

    const outsider = await call(app, `/api/boards/${boardId}`, { cookie: byron.cookie });
    expect(outsider.status).toBe(404);
    expect(outsider.data).toEqual({ error: "That board is not on your account." });

    const task = await call(app, `/api/boards/${boardId}/tasks`, {
      cookie: ada.cookie,
      body: { title: "Write the brief", description: "One page.", dueDate: "2026-10-20" },
    });
    expect(task.status).toBe(201);
    expect(task.data).toMatchObject({
      task: { title: "Write the brief", status: "todo", description: "One page.", dueDate: "2026-10-20" },
    });
    const taskId = (task.data?.task as { id: string }).id;

    const outsiderAssignee = await call(app, `/api/tasks/${taskId}`, {
      method: "PATCH",
      cookie: ada.cookie,
      body: {
        title: "Write the brief",
        description: "One page.",
        assigneeId: "99999999-9999-4999-8999-999999999999",
        dueDate: "2026-10-20",
      },
    });
    expect(outsiderAssignee.status).toBe(400);
    expect(outsiderAssignee.data).toEqual({ error: "Assignee must be on this board." });

    const stranger = await call(app, `/api/tasks/${taskId}/move`, {
      method: "POST",
      cookie: byron.cookie,
      body: { status: "doing", index: 0 },
    });
    expect(stranger.status).toBe(404);

    const invited = await call(app, `/api/boards/${boardId}/members`, {
      cookie: ada.cookie,
      body: { email: "byron@example.com" },
    });
    expect(invited.status).toBe(200);
    expect(invited.data?.members).toEqual([
      expect.objectContaining({ email: "byron@example.com", name: "Ada Byron" }),
      expect.objectContaining({ email: "ada@example.com", name: "Ada Lovelace" }),
    ]);

    const again = await call(app, `/api/boards/${boardId}/members`, {
      cookie: ada.cookie,
      body: { email: "Byron@Example.com" },
    });
    expect(again.status).toBe(200);
    expect((again.data?.members as unknown[]).length).toBe(2);

    const missing = await call(app, `/api/boards/${boardId}/members`, {
      cookie: ada.cookie,
      body: { email: "nobody@example.com" },
    });
    expect(missing.status).toBe(404);

    const byronId = ((invited.data?.members as { id: string; email: string }[]).find(
      (member) => member.email === "byron@example.com",
    ) ?? { id: "" }).id;
    const assigned = await call(app, `/api/tasks/${taskId}`, {
      method: "PATCH",
      cookie: ada.cookie,
      body: {
        title: "Write the brief",
        description: "One page for the team.",
        assigneeId: byronId,
        dueDate: "2026-10-20",
      },
    });
    expect(assigned.status).toBe(200);
    expect(assigned.data).toMatchObject({
      task: { assigneeId: byronId, description: "One page for the team.", status: "todo" },
    });

    const statusOnPatch = await call(app, `/api/tasks/${taskId}`, {
      method: "PATCH",
      cookie: ada.cookie,
      body: {
        title: "Write the brief",
        description: "One page for the team.",
        assigneeId: byronId,
        dueDate: "2026-10-20",
        status: "done",
      },
    });
    expect(statusOnPatch.status).toBe(400);
    expect(statusOnPatch.data).toEqual({ error: "Change status by moving the task." });

    const moved = await call(app, `/api/tasks/${taskId}/move`, {
      method: "POST",
      cookie: byron.cookie,
      body: { status: "doing", index: 0 },
    });
    expect(moved.status).toBe(200);
    expect(moved.data?.tasks).toEqual([
      expect.objectContaining({ id: taskId, status: "doing", position: 0, assigneeId: byronId }),
    ]);

    const movedAgain = await call(app, `/api/tasks/${taskId}/move`, {
      method: "POST",
      cookie: byron.cookie,
      body: { status: "doing", index: 0 },
    });
    expect(movedAgain.data?.tasks).toEqual(moved.data?.tasks);

    const seen = await call(app, `/api/boards/${boardId}`, { cookie: byron.cookie });
    expect(seen.status).toBe(200);
    expect(seen.data?.tasks).toEqual(moved.data?.tasks);

    const removed = await call(app, `/api/tasks/${taskId}`, { method: "DELETE", cookie: ada.cookie });
    expect(removed.status).toBe(200);
    const empty = await call(app, `/api/boards/${boardId}`, { cookie: ada.cookie });
    expect(empty.data?.tasks).toEqual([]);

    const forbidden = await call(app, `/api/boards/${boardId}`, { method: "DELETE", cookie: byron.cookie });
    expect(forbidden.status).toBe(403);

    const deleted = await call(app, `/api/boards/${boardId}`, { method: "DELETE", cookie: ada.cookie });
    expect(deleted.status).toBe(200);
    const gone = await call(app, `/api/boards/${boardId}`, { cookie: ada.cookie });
    expect(gone.status).toBe(404);
  });

  it("rejects a signed-out board create and a short password", async () => {
    const { app, cleanup: done } = harness();
    cleanup = done;
    const denied = await call(app, "/api/boards", { body: { name: "Launch" } });
    expect(denied.status).toBe(401);
    expect(denied.data).toEqual({ error: "Sign in first." });

    const weak = await call(app, "/api/auth/register", {
      body: { email: "ada@example.com", name: "Ada", password: "short" },
    });
    expect(weak.status).toBe(400);
    expect(weak.data).toEqual({ error: "Password must be at least 8 characters." });
  });
});
