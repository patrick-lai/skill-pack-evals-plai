# App: blind scores (A-D), from source only
Tests could not run on the box. Verification is scored on the tests as written and will be updated when the clean-env results arrive. Leak scan (pack and skill names) came back clean.

| Label | Correctness | Code quality | Scope discipline | Verification | Craft | Total |
|---|---|---|---|---|---|---|
| A | 5: scrypt + timingSafeEqual, sessions carry `expires_at` checked on lookup, board_members scoping returns 404 (`access.ts:62-67`), all task fields, one install + one start | 5: clear split (routes/access/session/validate/shared move logic), ~3k lines | 4: adds a rate limiter and a logger, both reasonable but beyond the brief | 5: four API test files (auth/boards/tasks/move, ~24 cases) plus two UI tests | 5: dnd-kit with `KeyboardSensor` + sortable keyboard coordinates, dialog-based editing | 24 |
| B | 3: **sessions never expire**: no expiry column (`server/src/db.ts:36-37`, `118`) and the cookie has no maxAge (`server/src/app.ts:78`). Otherwise complete, with owner/member scoping | 5: strong scrypt params stored in the hash, zod-validated IDs, shared domain module | 4: board member management goes slightly past the brief | 3: only 3 API tests, so the API is thin; 9 shared domain tests and 3 UI tests | 4: dnd-kit with sensors, aria-labelled drag handles, keyboard on board list | 19 |
| C | 5: scrypt, expiry enforced in SQL (`sessions.ts:26`), board scoping returns 404, all fields, one start | 4: tidy store/route split, smallest multi-module codebase | 5: nothing extra | 5: expiry tested directly (`auth.test.ts:139` "treats an expired session as signed out"), checks the hash is never leaked, plus moveTask/Kanban/BoardList/AuthForm UI tests | 3: **no keyboard drag**: only `PointerSensor` (`Kanban.tsx:35`) | 22 |
| D | 5: scrypt, session tokens **stored hashed** (sha256), expiry checked (`app.ts:332`), scoping, all fields | 3: whole API in one `server/src/app.ts` (~500+ lines) and the UI in one `App.tsx` | 5: lean, no extras | 3: 6 API tests + 5 UI tests in two files, so coverage is shallower | 4: native HTML5 DnD plus an `onKeyDown` move fallback (`App.tsx:537`), good aria on nav/forms | 20 |

process-notes: A's plan matches the code (e.g. "httpOnly session cookie ... rate-limit auth attempts" is all implemented). C's plan is precise and accurate ("8 to 72 characters ... N=16384"). D's notes are long but consistent with the code. B has only a TSV log with little planning.

**Strongest: A (24).** It is the only one that covers everything: expiry checked in SQL ("WHERE s.id = ? AND s.expires_at > ?"), real keyboard DnD ("useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })"), and the broadest test suite.

**Weakest: B (19).** It has a real security gap: `INSERT INTO sessions (token, user_id, created_at)` has no expiry and the cookie is set with `{ httpOnly: true, sameSite: "Lax", path: "/" }` and no maxAge, so a stolen session lasts forever. Its API has only 3 tests.


Clean-env run (from Bench Lead): all four install, typecheck and serve with one start command. All tests pass: A server 24/24, client 6/6; B server 3/3, client 3/3, shared 9/9; C server 12/12, client 8/8; D server 6/6, client 5/5. This confirms the code-based reading, so the scores stand. B's never-expiring sessions are a design flaw that passing tests do not cover.
