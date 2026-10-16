# Boardline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Boardline, a local team task board with email/password auth, multiple boards, and draggable tasks, started with `npm install` and `npm start`.

**Architecture:** An npm workspace monorepo. `shared` holds the JSON types. `server` is an Express app on `127.0.0.1:43118` with SQLite via `better-sqlite3` and an httpOnly session cookie. `client` is a Vite React app on `127.0.0.1:43117` that proxies `/api` to the server. Tests hit the real Express app (Supertest) and render real React components (Testing Library).

**Tech Stack:** React 19, TypeScript, Vite, React Router, Express 4, better-sqlite3, Vitest, Supertest, Testing Library, `@dnd-kit/core`.

**Spec:** `docs/superpowers/specs/2026-10-15-team-task-board-design.md`

## Global Constraints

- Frontend is React + TypeScript on Vite. API is Node + TypeScript. Database is SQLite.
- `npm install` at the repo root installs every workspace. `npm start` runs the API and Vite. `npm test` runs server tests then client tests.
- Site URL is `http://127.0.0.1:43117`. API listens on `127.0.0.1:43118`. Vite proxies `/api`.
- Cookie name `boardline_session`. HttpOnly, SameSite=Lax, Path=/, Max-Age 604800. No Secure flag.
- Session lifetime is 7 days. Token is 32 random bytes, hex.
- Passwords: 8 to 72 characters, `scrypt` via `node:crypto` (`N=16384`, `r=8`, `p=1`, 16-byte salt, 32-byte key), encoded `scrypt$<saltHex>$<keyHex>`.
- Email is trimmed and lowercased, one `@`, a dot in the domain, max 254.
- Display name and board name: 1 to 80 after trim. Task title: 1 to 140. Description: 0 to 4000. Due date `YYYY-MM-DD` or null.
- Status is only `todo`, `doing`, `done`.
- SQLite file for dev: `data/boardline.sqlite`. Tests use a temporary or `:memory:` database.
- Error strings and status codes are exactly those in the spec. A missing board and a forbidden board both return 404 `{ "error": "Board not found." }`. Same for tasks: `{ "error": "Task not found." }`.
- JSON error shape is `{ "error": string }`. User objects are `{ id, email, name }` only.

## Review Focus

- An expired session cookie must behave as signed out: `GET /api/auth/me` returns 401. A still-valid cookie must not.
- Whitespace-only title, board name, and display name must be rejected with the "required" strings, not stored.
- Removing a member must set `assignee_id` to null on that board's tasks that were assigned to them, and must not touch other boards.
- Moving a task to another column must close the gap in the source column and append without duplicating positions.
- A task id belonging to someone else's board must return 404 on PATCH and DELETE, and must not change that task.
- A past due date on a `done` task is not overdue; the same date on a `todo` task is.

## File structure

- `package.json` — workspaces `shared`, `server`, `client`; scripts `start`, `test`, `typecheck`.
- `shared/src/index.ts` — exported types from the spec.
- `server/src/db.ts` — open database, migrate, foreign keys.
- `server/src/passwords.ts` — `hashPassword`, `verifyPassword`.
- `server/src/validate.ts` — field validators returning an error string or null.
- `server/src/users.ts`, `server/src/sessions.ts`, `server/src/boards.ts`, `server/src/tasks.ts` — SQL.
- `server/src/app.ts` — `createApp(db)`.
- `server/src/index.ts` — listen on 43118, open `data/boardline.sqlite`.
- `server/test/*.test.ts` — API tests.
- `client/src/api.ts` — `api()` and `ApiError`.
- `client/src/auth/AuthForm.tsx`, `client/src/auth/AuthPage.tsx`.
- `client/src/boards/BoardList.tsx`, `client/src/boards/BoardsPage.tsx`.
- `client/src/board/moveTask.ts`, `client/src/board/Kanban.tsx`, `client/src/board/TaskDialog.tsx`, `client/src/board/BoardPage.tsx`.
- `client/src/styles.css`, `client/src/App.tsx`, `client/src/main.tsx`.
- `README.md`.

---

### Task 1: Scaffold

**Files:**
- Create: `package.json`, `shared/package.json`, `shared/src/index.ts`, `server/package.json`, `server/tsconfig.json`, `client/package.json`, `client/tsconfig.json`, `client/vite.config.ts`, `client/index.html`, `.gitignore`
- Test: none (configuration only)

**Interfaces:**
- Produces: workspace package `@boardline/shared` exporting `User`, `BoardSummary`, `BoardDetail`, `Member`, `Task`, `TaskStatus`, `MemberRole`.
- Produces: root scripts `start`, `test`, `typecheck`.

- [ ] **Step 1: Add the workspace manifests, shared types, tsconfig files, Vite proxy config, and gitignore.**

Shared types match the spec field-for-field. Vite `server.port` is `43117`, `server.host` is `127.0.0.1`, `server.strictPort` is true, proxy `/api` to `http://127.0.0.1:43118`. Root `start` runs server and client with `concurrently -k`. Root `test` runs server tests then client tests.

- [ ] **Step 2: Install**

Run: `npm install`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json shared server/package.json server/tsconfig.json client/package.json client/tsconfig.json client/vite.config.ts client/index.html .gitignore
git commit -m "chore: scaffold Boardline workspaces"
```

### Task 2: Auth API

**Files:**
- Create: `server/src/db.ts`, `server/src/passwords.ts`, `server/src/validate.ts`, `server/src/users.ts`, `server/src/sessions.ts`, `server/src/app.ts`, `server/src/index.ts`, `server/vitest.config.ts`, `server/test/helpers.ts`, `server/test/auth.test.ts`
- Test: `server/test/auth.test.ts`

**Interfaces:**
- Consumes: `User` from `@boardline/shared`.
- Produces: `createApp(db: Database): Express`, `openDatabase(filename: string): Database`.
- Produces: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` with the spec's status codes and error strings.
- Produces: `hashPassword(password: string): string`, `verifyPassword(password: string, encoded: string): boolean`.

- [ ] **Step 1: Write the failing auth tests**

Cover, with literal error strings from the spec:

- `hashPassword` then `verifyPassword` accepts the same password and rejects a different one.
- Register returns 201 `{ user: { id, email, name } }`, sets `boardline_session`, and `GET /api/auth/me` returns that user. The response body does not contain `scrypt$`.
- Register with password `short` returns 400 `"Password must be at least 8 characters."`
- Register with email `not-an-email` returns 400 `"Enter a valid email."`
- Register with name `"   "` returns 400 `"Name is required."`
- A second register with the same email returns 409 `"An account with that email already exists."`
- Login with the right password returns 200 and `me` works. Login with the wrong password and login with an unknown email both return 401 `"Email or password is incorrect."`
- Logout returns 204 and the following `GET /api/auth/me` returns 401 `"Sign in required."`
- A session whose `expires_at` is in the past returns 401 on `GET /api/auth/me`.

- [ ] **Step 2: Run the tests and confirm they fail because the modules do not exist**

Run: `npm test -w server -- test/auth.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement schema, scrypt, session cookie, and auth routes**

Tables as in the spec. Cookie and scrypt parameters as in Global Constraints. Email stored lowercased. Expired sessions are ignored. Duplicate email is a 409, not a 500.

- [ ] **Step 4: Re-run auth tests**

Run: `npm test -w server -- test/auth.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server
git commit -m "feat: add email and password sessions"
```

### Task 3: Boards API

**Files:**
- Create: `server/src/boards.ts`, `server/src/routes/boards.ts` (or board routes inside `app.ts` if that file stays readable — prefer `server/src/boardRoutes.ts`)
- Modify: `server/src/app.ts`
- Test: `server/test/boards.test.ts`

**Interfaces:**
- Consumes: `createApp`, `openDatabase`, auth cookie from Task 2.
- Produces: `GET/POST /api/boards`, `GET/PATCH/DELETE /api/boards/:boardId`, `POST /api/boards/:boardId/members`, `DELETE /api/boards/:boardId/members/:userId`.
- `BoardSummary.role` is `owner` for the creator and `member` for someone added by email. `taskCount` is the number of tasks on that board.

- [ ] **Step 1: Write the failing board tests**

- Unauthenticated `GET /api/boards` returns 401 `"Sign in required."`
- Create board `"Launch"` returns 201 with `role: "owner"` and `taskCount: 0`. List returns that board.
- Create with name `"   "` returns 400 `"Board name is required."`
- A second user listing boards does not see the first user's board. `GET /api/boards/:id` as the second user returns 404 `"Board not found."`
- Owner adds the second user by email. The second user can `GET` the board and sees both members. Adding the same email again returns 409 `"That person is already on this board."` Adding `missing@example.com` returns 404 `"No account with that email."`
- A member `PATCH` name returns 403 `"Only the owner can do that."` The owner `PATCH` renames it.
- A member `DELETE` returns 403 `"Only the owner can do that."` The owner `DELETE` returns 204 and a later `GET` returns 404.
- Owner cannot `DELETE` their own membership: 400 `"The owner cannot be removed."`
- After a member is removed, a task on that board assigned to them has `assigneeId: null`. A task on a different board assigned to them is unchanged. (Create those tasks through the database in the test helper if the task routes do not exist yet, or through the API if Task 4 has landed. This test lives here and may insert tasks with SQL.)

- [ ] **Step 2: Run and confirm FAIL**

Run: `npm test -w server -- test/boards.test.ts`
Expected: FAIL, 404 from unimplemented routes.

- [ ] **Step 3: Implement board and member routes**

Owner is inserted into `board_members` with role `owner` in the same transaction as the board. Forbidden and missing both return 404 for reads. Mutations that are owner-only return 403 with the spec string when the caller is a member.

- [ ] **Step 4: Run board tests**

Run: `npm test -w server -- test/boards.test.ts`
Expected: PASS. Then `npm test -w server` so auth stays green.

- [ ] **Step 5: Commit**

```bash
git add server
git commit -m "feat: add boards and members"
```

### Task 4: Tasks API

**Files:**
- Create: `server/src/taskStore.ts`, `server/src/taskRoutes.ts`
- Modify: `server/src/app.ts`
- Test: `server/test/tasks.test.ts`

**Interfaces:**
- Consumes: board membership from Task 3.
- Produces: `POST /api/boards/:boardId/tasks`, `PATCH /api/tasks/:taskId`, `DELETE /api/tasks/:taskId`.
- `placeTask` behavior: status change with no `position` appends and closes the source gap. `position` inserts at that index, clamped to the column. Positions in a column stay unique and contiguous from 0.

- [ ] **Step 1: Write the failing task tests**

- Member creates `{ title: "Write spec", description: "Notes", dueDate: "2026-10-20", assigneeId: <self> }` and gets 201 `status: "todo"`, `position: 0`, description `"Notes"`.
- Title `"   "` returns 400 `"Title is required."`
- `dueDate: "20-10-2026"` returns 400 `"Due date must be YYYY-MM-DD."`
- `assigneeId` of a user who is not a member returns 400 `"Assignee is not on this board."`
- `status: "later"` returns 400 `"Status must be todo, doing, or done."`
- A second todo gets `position: 1`. `PATCH` the first to `{ status: "doing" }` makes its position `0` in doing, and the remaining todo's position `0`.
- `PATCH` `{ status: "todo", position: 0 }` on a task that was at the end inserts it at the front and shifts the neighbor.
- `PATCH` title, description, assignee, and due date to nulls returns the cleared task.
- `DELETE` returns 204 and the task is gone from `GET /api/boards/:id`.
- The other user, who is not a member, `PATCH` that task id and gets 404 `"Task not found."` The task title is unchanged.
- Unauthenticated `POST` returns 401.

- [ ] **Step 2: Run and confirm FAIL**

Run: `npm test -w server -- test/tasks.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement task routes and position updates inside a transaction**

Use the position algorithm from the design: park the moving row at `position = -1`, close the gap, shift the destination from the high end, then set the index. Unique index on `(board_id, status, position)`.

- [ ] **Step 4: Run server tests**

Run: `npm test -w server`
Expected: PASS, entire server suite.

- [ ] **Step 5: Commit**

```bash
git add server
git commit -m "feat: add tasks with status, assignee, and due date"
```

### Task 5: Auth UI

**Files:**
- Create: `client/src/main.tsx`, `client/src/App.tsx`, `client/src/api.ts`, `client/src/styles.css`, `client/src/auth/AuthForm.tsx`, `client/src/auth/AuthPage.tsx`, `client/src/auth/AuthForm.test.tsx`, `client/src/vite-env.d.ts`, `client/vitest.config.ts`, `client/src/test-setup.ts`
- Test: `client/src/auth/AuthForm.test.tsx`

**Interfaces:**
- Consumes: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` via `api<T>(path, init)`.
- Produces: `AuthForm` props `{ mode: "sign-in" | "register"; pending: boolean; error: string | null; onToggle: () => void; onSubmit: (values: { name?: string; email: string; password: string }) => void }`.
- `api` throws `ApiError` with the server's `error` string. Status 204 returns `undefined`.

- [ ] **Step 1: Write the failing AuthForm tests**

- Sign-in mode: typing `ada@example.com` / `password1` and clicking `Sign in` calls `onSubmit` with `{ email: "ada@example.com", password: "password1" }`. The name field is absent.
- Register mode: the name field is present. Submit calls `onSubmit` with `{ name: "Ada", email: "ada@example.com", password: "password1" }`.
- `error="Email or password is incorrect."` renders that text.

- [ ] **Step 2: Run and confirm FAIL**

Run: `npm test -w client -- src/auth/AuthForm.test.tsx`
Expected: FAIL, module missing.

- [ ] **Step 3: Implement AuthForm, AuthPage, api(), session gate, and the workshop-ledger styles for the auth screen**

`AuthPage` loads `GET /api/auth/me`. While loading, text is `Loading…`. Signed-out users see `AuthForm`. A failed submit shows `error.message`. Pending button text is `Signing in…` or `Creating account…` and the button is disabled. Success calls `onAuthenticated`.

- [ ] **Step 4: Run the auth UI tests**

Run: `npm test -w client -- src/auth/AuthForm.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client
git commit -m "feat: add sign-in and registration screens"
```

### Task 6: Board list UI

**Files:**
- Create: `client/src/boards/BoardList.tsx`, `client/src/boards/BoardsPage.tsx`, `client/src/boards/BoardList.test.tsx`
- Modify: `client/src/App.tsx`, `client/src/styles.css`
- Test: `client/src/boards/BoardList.test.tsx`

**Interfaces:**
- Consumes: `BoardSummary`.
- Produces: `BoardList` props `{ boards: BoardSummary[]; onCreate: (name: string) => void; onOpen: (id: string) => void }`.
- Task count copy: `0 tasks`, `1 task`, `3 tasks`. Role copy: `Owner`, `Member`.

- [ ] **Step 1: Write the failing BoardList test**

Render one board named `Launch`, role `owner`, `taskCount: 3`. Expect text `Launch`, `Owner`, `3 tasks`. Type `Ops` into the board name field and click `New board`. `onCreate` is called with `"Ops"`. A `taskCount` of 1 renders `1 task`.

- [ ] **Step 2: Run and confirm FAIL**

Run: `npm test -w client -- src/boards/BoardList.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement BoardList and BoardsPage**

`BoardsPage` loads `GET /api/boards`. Empty list copy: `No boards yet. Name one and start a column of work.` Loading copy: `Loading boards…`. Failure shows the error and a `Try again` button. Create posts `{ name }` and navigates to `/boards/:id`. The top bar shows `Boardline`, the person's name, and `Sign out`.

- [ ] **Step 4: Run client tests**

Run: `npm test -w client`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client
git commit -m "feat: add the board list"
```

### Task 7: Kanban, drag, and task editor

**Files:**
- Create: `client/src/board/moveTask.ts`, `client/src/board/moveTask.test.ts`, `client/src/board/Kanban.tsx`, `client/src/board/Kanban.test.tsx`, `client/src/board/TaskDialog.tsx`, `client/src/board/BoardPage.tsx`
- Modify: `client/src/App.tsx`, `client/src/styles.css`
- Test: `client/src/board/moveTask.test.ts`, `client/src/board/Kanban.test.tsx`

**Interfaces:**
- Consumes: `Task`, `Member`, `TaskStatus`.
- Produces: `moveTask(tasks: Task[], taskId: string, toStatus: TaskStatus): Task[]` — task lands at the end of `toStatus`, source positions close from 0, other columns untouched.
- Produces: `resolveDrop(tasks: Task[], activeId: string, overId: string | null): { taskId: string; status: TaskStatus } | null`. Column ids are `column:todo`, `column:doing`, `column:done`. Card ids are `task:<taskId>`. Over a card, the status is that card's status. `null` over id returns null.
- Produces: `isOverdue(dueDate: string | null, status: TaskStatus, today: string): boolean` — true only when dueDate is a `YYYY-MM-DD` strictly before `today` and status is not `done`.
- Produces: `formatDue(dueDate: string): string` — `Due Oct 20`, day without a leading zero.

- [ ] **Step 1: Write the failing move and Kanban tests**

`moveTask` with todos `a` position 0, `b` position 1, and doing `c` position 0: moving `a` to `doing` yields `b` at todo position 0, `c` at doing position 0, `a` at doing position 1.

`resolveDrop(tasks, "a", "column:doing")` equals `{ taskId: "a", status: "doing" }`. `resolveDrop(tasks, "a", "task:c")` equals `{ taskId: "a", status: "doing" }`. `resolveDrop(tasks, "a", null)` equals null.

Render a Kanban with a todo task titled `Write spec`, due `2026-10-01`, and `today="2026-10-15"`. The Todo region contains `Write spec`. The card has `data-overdue="true"` and text `Due Oct 1`. A done task with the same due date has `data-overdue="false"`.

- [ ] **Step 2: Run and confirm FAIL**

Run: `npm test -w client -- src/board/moveTask.test.ts src/board/Kanban.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement moveTask, resolveDrop, Kanban, TaskDialog, and BoardPage**

Kanban columns are `role="region"` with accessible names `Todo`, `Doing`, `Done`. Empty column text is `Nothing here`. Cards use `@dnd-kit/core`. On drag end, `resolveDrop` then `onMove(taskId, status)`. `BoardPage` optimistically applies `moveTask` and `PATCH /api/tasks/:id` with `{ status }`. On failure, restore the previous tasks and show the error.

`TaskDialog` edits title, description, status, assignee (members plus Unassigned), and due date. Save patches the task. Delete asks `Delete this task?` then `DELETE`. Add task opens the dialog empty and `POST`s on save.

Invite (owner only) posts `{ email }`. Delete board (owner only) confirms with `Delete this board and its tasks?` then deletes and navigates to `/`. A 404 from the board load shows nothing on this screen; `BoardPage` navigates to `/` and the list shows `That board is not available.`

Assignee label on a card is the member's first whitespace-delimited name, or `Unassigned`.

- [ ] **Step 4: Run the whole test script**

Run: `npm test`
Expected: PASS, server and client.

- [ ] **Step 5: Commit**

```bash
git add client
git commit -m "feat: drag tasks across todo, doing, and done"
```

### Task 8: README and the one start command

**Files:**
- Modify: `README.md`
- Modify: `server/src/index.ts` if the listen path is not already `data/boardline.sqlite` on `127.0.0.1:43118`

**Interfaces:**
- Consumes: root `npm start`.

- [ ] **Step 1: Replace the README**

What Boardline is, prerequisite Node 22+, `npm install`, `npm start`, URL `http://127.0.0.1:43117`, `npm test`, SQLite path `data/boardline.sqlite`. No other setup steps.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add README.md server/src/index.ts
git commit -m "docs: describe install and start"
```

## Self-review

- Spec coverage: auth, boards, members, tasks, drag, tests, README, one install, one start are Tasks 1–8. Error strings are in Tasks 2–4. Screens are Tasks 5–7.
- Review focus items are pinned to Task 2 (expired session), Task 3 (whitespace board name, member removal clears assignee), Task 4 (whitespace title, position gap, cross-user task), Task 7 (done vs todo overdue).
- Type names match across tasks: `createApp`, `openDatabase`, `moveTask`, `resolveDrop`, `BoardSummary`, `Task`.
