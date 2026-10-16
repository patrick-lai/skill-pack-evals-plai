# ADR-001: Local stack for Bench

## Status
Accepted

## Date
2026-10-15

## Context
Bench is a team task board that must run on one machine after one install and one start command. The stack was fixed: a Vite React client, a Node TypeScript API, and SQLite. People sign in with email and password. Several people share a board.

## Decision
Use npm workspaces (`shared`, `server`, `client`). `npm start` runs the API on port 43124 and the Vite client on port 43123. The client proxies `/api`, so the browser uses one origin.

Store data with Node's built-in `node:sqlite`. The process enables it with `--experimental-sqlite`. A native driver such as `better-sqlite3` was rejected because its install script compiles an addon and is more likely to fail on a fresh machine.

Keep sessions in SQLite and send the id in an `HttpOnly`, `SameSite=Lax` cookie. The cookie value is an HMAC of the session id using `SESSION_SECRET`, or a secret generated into `data/session-secret` when the environment variable is absent. Tokens in `localStorage` were rejected because page scripts can read them.

Passwords are hashed with Node `scrypt`. There is no mail transport, so there is no email verification or password reset.

Reorder logic lives in `@bench/shared` and is used by both the API and the drag handler, so a column move cannot mean two different things.

## Alternatives Considered

### better-sqlite3
- Pros: stable, widely used
- Cons: native compile step; conflicts with a script-light install
- Rejected: `node:sqlite` is already in Node 22 and keeps `npm install` free of addons

### JWT in localStorage
- Pros: no cookie setup
- Cons: any script on the page can steal the token
- Rejected: an httpOnly cookie is the smaller risk for a browser app

## Consequences
Node 22.13 or newer is required. The SQLite API is still marked experimental on Node 22, so the flag stays inside the npm scripts rather than in the README's user-facing command. `data/` is gitignored because it holds the database and the generated session secret.

`npm audit` on 2026-10-15 reports critical issues in Vitest and Tinypool. They sit on the test path only (`npm test`), not in `npm start`. Forcing the audit fix would jump the test runner past the versions this repo typechecks against, so the upgrade waits for the next deliberate dependency bump. Review by 2026-11-15.
