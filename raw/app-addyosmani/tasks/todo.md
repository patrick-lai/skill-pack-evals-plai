# Tasks

## Task 1: Identity

**Description:** Accounts and sessions so every later route knows the caller.

**Acceptance criteria:**
- [x] Register, login, logout, and me work over HTTP
- [x] Passwords are scrypt hashes and never returned
- [x] Session cookie is httpOnly and SameSite=Lax

**Verification:**
- [x] `npm run test -w @bench/server -- test/auth.test.ts`
- [x] Typecheck passes

**Dependencies:** None

**Files likely touched:**
- `server/src/db.ts`
- `server/src/routes/auth.ts`
- `server/test/auth.test.ts`

**Estimated scope:** Medium

## Task 2: Boards

**Description:** Multiple boards and membership, with non-members blocked.

**Acceptance criteria:**
- [x] A user can create and list only their boards
- [x] The owner can invite by email and remove a member
- [x] A non-member receives 404

**Verification:**
- [x] `npm run test -w @bench/server -- test/boards.test.ts`

**Dependencies:** Task 1

**Files likely touched:**
- `server/src/routes/boards.ts`
- `server/test/boards.test.ts`

**Estimated scope:** Medium

## Task 3: Tasks

**Description:** Task fields, status, assignee, due date, and persisted column order.

**Acceptance criteria:**
- [x] CRUD enforces the field rules
- [x] Moving a card updates status and positions
- [x] Assignee must be a member of the board

**Verification:**
- [x] `npm run test -w @bench/server -- test/tasks.test.ts`

**Dependencies:** Task 2

**Files likely touched:**
- `shared/src/move.ts`
- `server/src/routes/tasks.ts`
- `server/test/tasks.test.ts`

**Estimated scope:** Medium

## Task 4: Kanban UI

**Description:** Sign-in, board list, three columns, drag, and the task dialog.

**Acceptance criteria:**
- [x] Auth screen, empty boards, and a board with columns render
- [x] Drag and the move control both call the same reorder
- [x] Loading, empty, and error states exist
- [x] Layout works on a narrow viewport and a desktop viewport

**Verification:**
- [x] `npm run test -w @bench/client`
- [x] Browser pass of register, create board, create task, drag

**Dependencies:** Task 3

**Files likely touched:**
- `client/src/components/AuthScreen.tsx`
- `client/src/components/BoardIndex.tsx`
- `client/src/components/BoardView.tsx`
- `client/src/components/BoardColumns.tsx`

**Estimated scope:** Medium

## Task 5: Run instructions

**Description:** A new machine can install once and start once.

**Acceptance criteria:**
- [x] README lists Node version, `npm install`, and `npm start`
- [x] ADR records session cookies and SQLite

**Verification:**
- [x] `npm test` from a clean install path
- [x] `npm start` serves the UI

**Dependencies:** Task 4

**Files likely touched:**
- `README.md`
- `docs/decisions/ADR-001-local-stack.md`
- `package.json`

**Estimated scope:** Small

## Checkpoint: After Tasks 1-3

- [x] API tests pass
- [x] Server typecheck passes

## Checkpoint: Complete

- [x] `npm test` passes
- [x] Register, invite, and drag work in the browser
- [x] README matches the commands that were run
