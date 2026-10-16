# Boardline

Boardline is a local team task board. People create an account, share a board by email, and drag tasks across Todo, Doing, and Done.

## Prerequisites

Node.js 22 or newer.

## Run

From the repository root:

```bash
npm install
npm start
```

Open [http://127.0.0.1:43117](http://127.0.0.1:43117).

The API listens on `127.0.0.1:43118`. The site proxies `/api` to it, so the session cookie stays on the page you opened.

## Tests

```bash
npm test
```

## Data

SQLite is created at `data/boardline.sqlite` the first time the API starts. To share a board, both people register, then the owner uses Invite and types the other person's email.
