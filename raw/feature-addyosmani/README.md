# Quay

Quay is a team task board. Sign in, open a board, and move work across **To do**, **Doing**, and **Done**.

Tasks have a title, description, status, assignee, and due date. Open a task to leave a comment. Comments show who wrote them and when, and you can delete your own. Each card shows how many comments it has. A board can include more than one person. Drag a card onto another column, or onto a card in that column, to change where it sits.

## Requirements

- Node.js 22 or newer

## Setup and run

From the repository root:

```bash
npm install
npm start
```

`npm install` installs the React client and the API. `npm start` runs both.

- Web app: http://127.0.0.1:43123
- API: http://127.0.0.1:43124

The web app proxies `/api` to the API. Register from the sign-up page. Passwords are hashed, and the session is an httpOnly cookie.

To put someone on a board, they need an account first. Open **People** and invite them by email. Assignees are members of that board.

## Tests

```bash
npm test
```

That runs the API tests and the UI tests. `npm run typecheck` checks TypeScript in both packages.

## Data and configuration

The SQLite database is created at `data/quay.sqlite` the first time the API starts. That folder is gitignored.

Optional overrides live in a `.env` file at the repository root. See `.env.example`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `43124` | API port |
| `DATABASE_PATH` | `data/quay.sqlite` | SQLite file, relative to the repository root |
| `JWT_SECRET` | a development secret | Signs the session cookie |

The web app port is `43123`, set in `client/vite.config.ts`.

If `JWT_SECRET` is unset, the API prints a warning and uses a local development secret. Set a long random secret before sharing the server.

## Layout

- `client/` — React, TypeScript, and Vite
- `server/` — Node, TypeScript, and SQLite (`better-sqlite3`)
- `data/` — database file, created at runtime
