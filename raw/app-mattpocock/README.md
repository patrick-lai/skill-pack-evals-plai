# Quay

Quay is a team task board. One team shares every board. Each board has three columns: To do, Doing, and Done. Members sign in, open boards, and drag tasks between columns.

## Requirements

- Node.js 22 or newer. The API uses Node's built-in SQLite.
- npm

## Setup and run

From the repository root:

```bash
npm install
npm start
```

Open http://127.0.0.1:43123

The first start creates `server/data/quay.sqlite`. Join from the page with your email and a password. Anyone who joins this installation is on the same team and can see every board.

The page is served on port 43123 and proxies `/api` to the API on port 43124. Stop both with Ctrl+C.

## Tests and typecheck

```bash
npm test
npm run typecheck
```

## What you can do

- Join, or sign in with email and password
- Open more than one board
- Add a task with a title, description, assignee, and due date
- Drag a task between To do, Doing, and Done
- Edit or delete a task
- Rename or delete a board

Sign out from the header. A session lasts 14 days.
