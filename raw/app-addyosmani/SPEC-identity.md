# Spec: identity

## Objective

A person can create an account with email, name, and password, sign in, stay signed in, and sign out. Nobody else can act as them. This is the gate for every board and task.

Success for the user: after registering or signing in, the app knows who they are until they sign out or the session expires.

## Tech Stack

- Node.js 22, TypeScript, Express 4
- SQLite through `node:sqlite` (built in; no native addon)
- Password hashing: Node `scrypt`
- Session: random id stored in SQLite, HMAC-signed, delivered in an `HttpOnly` `SameSite=Lax` cookie named `board_session`
- Validation: Zod at the HTTP boundary

## Commands

```
Install: npm install
Dev:     npm start
Test:    npm test
API only: npm run start -w @bench/server
API tests: npm run test -w @bench/server
```

`npm start` listens on `127.0.0.1:43124` for the API and `127.0.0.1:43123` for the client. The client proxies `/api`.

## Project Structure

```
server/src/app.ts          Express app factory (used by tests and the server)
server/src/routes/auth.ts  Register, login, logout, me
server/src/passwords.ts    scrypt hash and verify
server/src/session.ts      Cookie sign/verify and session rows
server/test/auth.test.ts   HTTP tests against an in-memory database
```

## Code Style

```ts
export async function register(req: Request, res: Response) {
  const input = parseBody(registerSchema, req.body);
  const user = createUser(db, input);
  res.status(201).json({ user: publicUser(user) });
}
```

- TypeScript strict. Semicolons. Single quotes. Named exports.
- Validate at the route. Trust values after parsing.
- Errors share one shape: `{ error: { code, message, details? } }`.
- Never select or return `password_hash`.

## Testing Strategy

Vitest and Supertest hit the real Express app and a real in-memory SQLite database. No mocked database.

Cover: register, duplicate email, login, wrong password, unknown email (same error as wrong password), cookie flags, `GET /api/auth/me` with and without a session, logout, and the auth rate limit.

## Boundaries

- Always: hash passwords with scrypt; httpOnly session cookie; parameterized SQL; generic login errors; rate-limit auth attempts (10 per 15 minutes per IP and email).
- Ask first: a new auth factor, password reset email, or a change to the session cookie policy.
- Never: commit `data/session-secret` or a real `SESSION_SECRET`; store the session in localStorage; log passwords or session tokens.

## Success Criteria

- `POST /api/auth/register` creates a user and a session.
- `POST /api/auth/login` starts a session only when email and password match.
- `POST /api/auth/logout` ends that session.
- `GET /api/auth/me` returns the signed-in user or 401.
- Responses never contain a password hash.
- Unauthenticated calls to board and task routes return 401.

## Open Questions

None left for this build. No email verification and no password reset, because the app runs locally and has no mail transport. A missing `SESSION_SECRET` is generated into `data/session-secret` (gitignored) so `npm start` works with one command.
