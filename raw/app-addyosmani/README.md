# Bench

Bench is a local team task board. Sign in, keep more than one board, invite teammates who already have accounts, and move tasks across **To do**, **Doing**, and **Done**.

Each task has a title, description, status, assignee, and due date. Drag a card by its handle, or use the Move menu on the card if you are on a keyboard or a phone.

## Requirements

- Node.js 22.13 or newer
- npm 10 or newer

## Setup and run

From the repository root:

```bash
npm install
npm start
```

- App: [http://127.0.0.1:43123](http://127.0.0.1:43123)
- API: [http://127.0.0.1:43124](http://127.0.0.1:43124)

The page proxies `/api` to the API, so the browser only talks to port 43123. Stop both with Ctrl+C.

The SQLite file is created at `data/board.sqlite` on first start. If `SESSION_SECRET` is unset, the server writes a random secret to `data/session-secret`. Both live under `data/` and are not committed. Copy `.env.example` if you want to set the secret or the ports yourself.

## First board

1. Open the app and create an account.
2. Create a second account in a private window if you want a teammate.
3. On a board, choose **Invite** and enter the teammate's email.
4. Add a task, then drag it to another column.

## Tests

```bash
npm test
```

API tests use an in-memory database. UI tests use Testing Library.

## Layout

- `client/` — Vite, React, TypeScript
- `server/` — Express, TypeScript, `node:sqlite`
- `shared/` — task statuses and the column reorder used by both sides
- `docs/decisions/` — why the stack looks like this
