# Implementation Plan: Bench

## Overview

Bench is a local team task board. One `npm install` and one `npm start` run a Vite React client and an Express API backed by SQLite. People register with email and password, keep several boards, invite teammates, and move tasks across To do, Doing, and Done.

## Architecture Decisions

- Monorepo npm workspaces: `shared`, `server`, `client`. Shared code is the task status union and the column reorder function, so the API and the drag UI cannot drift.
- `node:sqlite` instead of a native driver. Node 22 already ships it, so install does not compile addons. The server process enables it with `--experimental-sqlite`.
- Session cookie, not a token in localStorage. The cookie is httpOnly and SameSite=Lax. The session row lives in SQLite.
- Express app is created by a factory that accepts a database, so API tests use `:memory:` and Supertest without opening a port.
- Vite dev server on port 43123 proxies `/api` to port 43124. The browser talks to one origin.
- shadcn/ui primitives (Button, Input, Label, Dialog, Textarea) on Tailwind CSS. Visual language is a warm plaster-and-ink workshop board, not a purple gradient template.
- Drag uses `@dnd-kit`. A native select on each card performs the same status change for keyboard and for narrow screens.

## Dependency Graph

```
SQLite schema
  ├── users, sessions
  │     └── auth routes
  │           └── board membership
  │                 └── tasks and planMove
  └── shared types
        └── React client
```

## Task List

### Phase 1: Identity
- [x] Task 1: Schema, password hashing, session cookie, auth routes, auth tests

### Phase 2: Boards
- [x] Task 2: Board CRUD, membership, authorization tests

### Phase 3: Tasks and UI
- [x] Task 3: Task routes, reorder, task API tests
- [x] Task 4: Client shell, auth screen, board index, kanban, drag, UI tests

### Phase 4: Ship locally
- [x] Task 5: README, ADR, root start script, browser pass

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `node:sqlite` is still marked experimental on Node 22 | Medium | Pin the flag inside npm scripts and document Node 22. Keep SQL in one migration string. |
| Drag math differs between client and server | High | One `planMove` in `shared`, used by both. API test covers a cross-column move. |
| Native modules fail to build in this environment | High | Do not add `better-sqlite3`. |
| Two ports confuse "one command" | Low | `npm start` runs both. The README lists only `npm install` and `npm start`. |

## Open Questions

None that block the build. See the module specs.
