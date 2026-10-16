# Boardline — team task board

## Intent

A small team needs one place to see who is doing what. Boardline is a local web app: people create an account, open a shared board, and move tasks across Todo, Doing, and Done. It exists so the work is visible without a hosted service.

The task prompt is the whole request. This session cannot pause for a design interview, so the prompt is treated as opting out of further questions. Everything below that the prompt did not state is a builder call, marked as such.

## Goals

- Email and password accounts, with a session that survives a refresh.
- Several boards. A person only sees boards they belong to.
- Tasks with title, description, status (`todo`, `doing`, `done`), assignee, and due date.
- Drag a task from one column to another. The new status is saved.
- Basic automated tests for the API and the UI.
- A README that says how to install and run.
- One install command and one start command, both from the repo root, with no external services.

## Non-goals

- Email delivery, password reset, or OAuth.
- Real-time multiplayer. Two browsers see each other's changes after a refresh or after their own action.
- File attachments, comments, labels, or subtasks.
- Hosted deployment, Docker, or a production process manager.

## Anti-goals

- A board that loads another team's tasks.
- A start flow that needs more than `npm install` and `npm start`.
- Passwords stored in a recoverable form.

## Constraints

- Frontend: React + TypeScript, built with Vite.
- API: Node + TypeScript.
- Database: SQLite, file on disk, created automatically.
- Node 22 is the local runtime.
- Ports: the site is served at `http://127.0.0.1:43117`. The API listens on `127.0.0.1:43118`. Vite proxies `/api` to the API so the browser is same-origin and the session cookie is sent.
- Cookie name: `boardline_session`. HttpOnly, SameSite=Lax, Path=/. No Secure flag (local HTTP).
- Session lifetime: 7 days from login or register.
- Password rule: 8 to 72 characters. Stored as `scrypt` via `node:crypto` (`N=16384`, `r=8`, `p=1`, 16-byte salt, 32-byte key), encoded `scrypt$<saltHex>$<keyHex>`.
- Email is trimmed and lowercased. It must contain one `@` and a dot in the domain. Max 254 characters.
- Display name: 1 to 80 characters after trim.
- Board name: 1 to 80 characters after trim.
- Task title: 1 to 140 characters after trim. Description: 0 to 4000 characters. Due date: `YYYY-MM-DD` or null. Assignee: a member of that board, or null.
- Status values are only `todo`, `doing`, `done`.
- SQLite file: `data/boardline.sqlite`, created on API start. Directory `data/` is gitignored. Tests use a temporary file, never the dev database.

## What the prompt decided

- React + TypeScript (Vite) frontend, Node + TypeScript API, SQLite.
- Email/password auth, multiple boards, tasks with title, description, status, assignee, and due date, drag between columns, basic API tests, basic UI tests, README with setup and run steps, one install and one start command.

## Builder calls

- Product name: Boardline.
- One npm workspace repo: `shared`, `server`, `client`. Root scripts:
  - `npm install` — installs every workspace.
  - `npm start` — runs the API and Vite together.
  - `npm test` — runs server tests, then client tests.
- HTTP framework: Express 4. Database driver: `better-sqlite3`. Dev runner: `tsx`. Tests: Vitest in both workspaces. API tests talk to the real Express app through Supertest. UI tests use Vitest, Testing Library, and jsdom.
- Auth is a random 32-byte session token in the cookie, stored in SQLite. No JWT.
- A board has an owner (the creator) and members. Anyone with an account can be added by email. There is no invite email. Unknown email returns 404 with `{ "error": "No account with that email." }`.
- Only the owner may rename the board, delete the board, or remove a member. The owner cannot be removed. Any member may create, edit, move, and delete tasks.
- Drag between columns sets the task's status and appends it to the end of the target column. Reordering inside a column is supported by the same move endpoint and is part of the board, not a separate feature.
- No component library. The UI is custom CSS. Visual direction is a workshop ledger: warm paper background `#f3efe6`, ink `#1c1915`, teal accent `#0f6e6b`, serif headlines (Fraunces) and a plain UI face (Figtree), both loaded from Google Fonts with a system-font fallback.
- The client is a single-page app with three screens: sign in / create account, board list, board. Routing is `react-router` (`/`, `/boards/:boardId`).
- Empty, loading, and error states are first-class on every screen.
- On a narrow viewport the three columns scroll sideways. Drag still works. There is no separate mobile-only move control.

## Who uses it

Two or three people on one machine or one LAN, each with an account. The first person registers, creates a board, and adds the others by the email they registered with. They open the board, add tasks, assign them, set a due date, and drag them across columns.

## Screens

### Sign in

Split on a wide window: a short left panel ("The work, where the team can see it.") and a form on the right. The form has two modes, Sign in and Create account, switched by a text button.

Sign in fields: email, password. Submit label: "Sign in".

Create account fields: name, email, password. Submit label: "Create account".

Errors from the API appear above the button in the form, in the API's words. The button shows "Signing in…" or "Creating account…" while the request is in flight and is disabled. A successful response navigates to the board list.

### Board list

Top bar: "Boardline", the signed-in person's name, and "Sign out".

Heading: "Boards". A text field and "New board" create a board and open it. Empty state, when the person has no boards: "No boards yet. Name one and start a column of work."

Each board is a row: name, "Owner" or "Member", and the task count ("3 tasks" / "1 task" / "0 tasks"). Choosing a row opens the board. Loading: "Loading boards…". Failure: the error text and a "Try again" button.

### Board

Top bar stays. Under it: the board name as a large serif heading, member initials, and — for the owner — "Invite" and "Delete board". Any member sees "Add task".

Invite opens a small panel: email field, "Add member". Success closes the panel and shows the new initials. Failure shows the API error in the panel.

Delete board asks "Delete this board and its tasks?" with "Delete" and "Cancel". Confirm returns to the board list.

Three columns, in order: Todo, Doing, Done. Each column header shows the name and the count. A column with no tasks says "Nothing here".

A task card shows the title, the assignee's first name or "Unassigned", and the due date as "Due Oct 20" when set. A due date before today on a task that is not done is shown in `#9b3a2f`. The card is a button that opens the editor and a drag handle for the pointer.

The editor is a dialog: title, description, status, assignee (members plus Unassigned), due date, "Save", "Delete task", "Close". Delete asks for confirmation inside the dialog ("Delete this task?") before calling the API.

Dragging a card over a column highlights that column. On drop, the card moves immediately and the API is called. If the save fails, the card returns to where it was and a banner shows the error.

Leaving a board you no longer belong to (404 or 403) returns to the list with "That board is not available."

## API

JSON only. Errors are `{ "error": string }` and the status below. Authenticated routes with no session return 401 `{ "error": "Sign in required." }`. A board the user cannot access returns 404 `{ "error": "Board not found." }` for both missing and forbidden, so existence does not leak. A task on such a board returns the same 404 `{ "error": "Task not found." }`.

| Method | Path | Body | Success |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` | 201 `{ user }` + Set-Cookie |
| POST | `/api/auth/login` | `{ email, password }` | 200 `{ user }` + Set-Cookie |
| POST | `/api/auth/logout` | | 204, clears cookie |
| GET | `/api/auth/me` | | 200 `{ user }` |
| GET | `/api/boards` | | 200 `{ boards: BoardSummary[] }` |
| POST | `/api/boards` | `{ name }` | 201 `BoardSummary` (role owner, taskCount 0) |
| GET | `/api/boards/:boardId` | | 200 `BoardDetail` |
| PATCH | `/api/boards/:boardId` | `{ name }` | 200 `BoardSummary` |
| DELETE | `/api/boards/:boardId` | | 204 |
| POST | `/api/boards/:boardId/members` | `{ email }` | 201 `Member` |
| DELETE | `/api/boards/:boardId/members/:userId` | | 204 |
| POST | `/api/boards/:boardId/tasks` | `{ title, description?, status?, assigneeId?, dueDate? }` | 201 `Task` |
| PATCH | `/api/tasks/:taskId` | any subset of `{ title, description, status, assigneeId, dueDate, position }` | 200 `Task` |
| DELETE | `/api/tasks/:taskId` | | 204 |

`user` is `{ id, email, name }`. Never a password hash.

`BoardSummary`: `{ id, name, role: "owner" | "member", taskCount, createdAt }`.

`BoardDetail`: `{ id, name, role, createdAt, members: Member[], tasks: Task[] }`.

`Member`: `{ id, email, name, role }`.

`Task`: `{ id, boardId, title, description, status, assigneeId, dueDate, position, createdAt, updatedAt }`. `description` is `""` when empty. `assigneeId` and `dueDate` are `string | null`. `position` is an integer, unique among tasks of the same board and status, starting at 0. Lists are ordered by `position` ascending. Boards are ordered by `createdAt` ascending.

Validation failures are 400 with a specific `error` string:

- "Name is required."
- "Enter a valid email."
- "Password must be at least 8 characters."
- "Board name is required."
- "Title is required."
- "Status must be todo, doing, or done."
- "Assignee is not on this board."
- "Due date must be YYYY-MM-DD."
- "That person is already on this board."
- "The owner cannot be removed."
- "Only the owner can do that."

Duplicate email on register: 409 `{ "error": "An account with that email already exists." }`.

Wrong password or unknown email on login: 401 `{ "error": "Email or password is incorrect." }` for both cases.

Creating a task defaults `status` to `todo`, `description` to `""`, `assigneeId` and `dueDate` to null, and `position` to one past the current max in that status (or 0 if the column is empty).

`PATCH /api/tasks/:taskId` with `status` and no `position` appends the task to the end of the new column and closes the gap in the old column. With `position`, the task is inserted at that index in the destination column and neighbors shift. `position` alone reorders inside the current column.

## Data

Tables, all primary keys text UUIDs except sessions, whose primary key is the token:

- `users(id, email unique, name, password_hash, created_at)`
- `sessions(token, user_id, expires_at)`
- `boards(id, name, owner_id, created_at)`
- `board_members(board_id, user_id, role, primary key (board_id, user_id))`
- `tasks(id, board_id, title, description, status, assignee_id, due_date, position, created_at, updated_at)`

Foreign keys on. `created_at` / `updated_at` / `expires_at` are ISO-8601 UTC strings.

Deleting a board deletes its memberships and tasks. Deleting a user is not offered. Removing a member sets `assignee_id` to null on that board's tasks assigned to them.

## Tests that must exist

API, against a fresh temp database each test:

- Register creates a user and a session; `GET /api/auth/me` returns that user; password hash is not in the body.
- Register rejects a short password, a bad email, and a duplicate email with the strings above.
- Login accepts the right password and rejects the wrong one with the same message as an unknown email.
- Logout makes `GET /api/auth/me` return 401.
- A second user cannot list or open the first user's board.
- Creating a board, adding a member by email, and reading the board as that member returns the task they create.
- Owner-only actions reject a member with "Only the owner can do that."
- A task can be created, updated (title, description, assignee, due date), moved to `doing`, and deleted.
- An assignee who is not a member is rejected. A bad due date is rejected.
- Unauthenticated `GET /api/boards` returns 401.

UI:

- The sign-in form submits the email and password the person typed.
- Create-account mode shows the name field and submits name, email, and password.
- An API error string is shown in the form.
- The board list renders each board's name, role, and task count, and submits a new board name.
- The board renders a task in the column that matches its status, and shows an overdue due date on a todo task.
- Dropping a task on another column calls the move function with the new status. The move function itself, given a task list, a task id, and a destination status, returns the list with that task in the destination column at the end and the source column's positions closed up.

## README

The root README replaces the seed. It includes: what Boardline is, prerequisites (Node 22+), `npm install`, `npm start`, the URL `http://127.0.0.1:43117`, `npm test`, and where the SQLite file lives. No other setup steps.
