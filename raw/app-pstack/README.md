# Plank

Plank is a team task board. You sign in, open a board, and drag a task between To do, Doing, and Done.

## Run

You need Node.js 22.

```bash
npm install
npm start
```

Open http://127.0.0.1:43123

The first screen asks you to create an account. A board starts with you as the only member. Add a teammate by the email they used to register, then assign them a task.

The API listens on port 43124. The page proxies `/api` to it, so the browser only talks to port 43123. Accounts, boards, and tasks are stored in `data/plank.sqlite` at the repo root.

## Test

```bash
npm test
```

That runs the shared ordering tests, the API tests, and the UI tests.
