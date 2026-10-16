# Cell verification

Extracted each tarball to its own directory. No source files were modified. Nothing was committed or pushed.

- Node v22.14.0, npm 10.9.9
- `app-mattpocock` from `uploads/app-mattpocock_156a.tgz` → `/tmp/cells/app-mattpocock`
- `app-addyosmani` from `uploads/app-addyosmani_63be.tgz` → `/tmp/cells/app-addyosmani`
- `app-pstack` from `uploads/app-pstack_e2e6.tgz` → `/tmp/cells/app-pstack`
- `feature-addyosmani` from `uploads/feature-addyosmani_3c7e.tgz` → `/tmp/cells/feature-addyosmani`
- `feature-mattpocock` from `uploads/feature-mattpocock_6468.tgz` → `/tmp/cells/feature-mattpocock`
- `app-superpowers` from `uploads/app-superpowers_29f3.tgz` → `/tmp/cells/app-superpowers`
- `feature-superpowers` from `uploads/feature-superpowers_aaa5.tgz` → `/tmp/cells/feature-superpowers`

Each app was started with the README `npm start`, probed for HTTP 200 within 60s, then stopped. No app processes were left running.

| cell | install | server tests | client tests | typecheck | start serves? | notes |
| --- | --- | --- | --- | --- | --- | --- |
| app-mattpocock | pass (exit 0) | 6 passed / 0 failed / 0 skipped | 5 passed / 0 failed / 0 skipped | pass (exit 0) | yes | One `npm test` (vitest projects `api` + `ui`): `server/src/app.test.ts` 6, `client/src/App.test.tsx` 5. Combined summary: Test Files 2 passed (2), Tests 11 passed (11), exit 0. No `/api/health` (404). Frontend `GET http://127.0.0.1:43123/` 200 in 1s. API `POST http://127.0.0.1:43124/api/auth/logout` 200. `GET /api/auth/me` 401. Install warning (not an error): `npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation` |
| app-addyosmani | pass (exit 0) | 24 passed / 0 failed / 0 skipped | 6 passed / 0 failed / 0 skipped | pass (exit 0) | yes | Server files: `tasks.test.ts` 5, `auth.test.ts` 8, `boards.test.ts` 4, `move.test.ts` 7. Client files: `BoardColumns.test.tsx` 3, `AuthScreen.test.tsx` 3. Both suites exit 0. README does not list typecheck; `npm run typecheck` is defined in `package.json` and was run. Frontend `GET http://127.0.0.1:43123/` 200 in 1s. API `GET http://127.0.0.1:43124/api/health` 200 (also 200 via the Vite proxy). Vite printed a config warning about `__dirname` and `configLoader: 'native'`. |
| app-pstack | pass (exit 0) | 3 passed / 0 failed / 0 skipped | 3 passed / 0 failed / 0 skipped | pass (exit 0) | yes | `npm test` also runs shared ordering tests, which are neither server nor client: `@plank/shared` 9 passed / 0 failed / 0 skipped (`src/domain.test.ts`), exit 0. Server: `test/api.test.ts` 3. Client: `lanes.test.tsx` 1, `auth-form.test.tsx` 2. README does not list typecheck; `npm run typecheck` is defined in `package.json` and was run (shared + server + client). No `/api/health` (404). Frontend `GET http://127.0.0.1:43123/` 200 in 1s. API `GET http://127.0.0.1:43124/api/auth/me` 200 (also 200 via the Vite proxy). Startup printed Node's experimental SQLite warning. |
| feature-addyosmani | pass (exit 0) | 10 passed / 0 failed / 0 skipped | 20 passed / 0 failed / 0 skipped | pass (exit 0) | yes | Server: 1 file, Tests 10 passed (10). Client: 6 files, Tests 20 passed (20). Both exit 0. Frontend `GET http://127.0.0.1:43123/` 200 in 2s. API `GET http://127.0.0.1:43124/api/health` 200 (also 200 via the Vite proxy). Startup warning: `JWT_SECRET is not set. Using a development secret. Set JWT_SECRET before sharing this server.` |
| feature-mattpocock | pass (exit 0) | 12 passed / 0 failed / 0 skipped | 18 passed / 0 failed / 0 skipped | pass (exit 0) | yes | Server: 1 file, Tests 12 passed (12). Client: 6 files, Tests 18 passed (18). Both exit 0. README lists `npm run typecheck`. No install errors. Frontend `GET http://127.0.0.1:43123/` 200 in 1s. API `GET http://127.0.0.1:43124/api/health` 200 (also 200 via the Vite proxy). `GET /api/auth/me` 401. Startup warning: `JWT_SECRET is not set. Using a development secret. Set JWT_SECRET before sharing this server.` |
| app-superpowers | pass (exit 0) | 12 passed / 0 failed / 0 skipped | 8 passed / 0 failed / 0 skipped | pass (exit 0) | yes | Server: `tasks.test.ts` 1, `boards.test.ts` 5, `auth.test.ts` 6 (Test Files 3 passed, Tests 12 passed). Client: `moveTask.test.ts` 3, `Kanban.test.tsx` 1, `AuthForm.test.tsx` 3, `BoardList.test.tsx` 1 (Test Files 4 passed, Tests 8 passed). Both exit 0. README does not list typecheck; `package.json` defines `npm run typecheck` (server + client) and it was run. Shared package has no test script. Install warnings (not errors): `npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation` and `npm warn deprecated prebuild-install@7.1.3: No longer maintained. Please contact the author of the relevant native addon; alternatives are available.` Ports are 43117/43118. Frontend `GET http://127.0.0.1:43117/` 200 in 2s. No `/api/health` (404). `GET /api/auth/me` 401. `POST /api/auth/logout` 204. `POST http://127.0.0.1:43118/api/auth/login` 200 after register (201). |
| feature-superpowers | pass (exit 0) | 11 passed / 0 failed / 0 skipped | 26 passed / 0 failed / 0 skipped | pass (exit 0) | yes | Server: 1 file, Tests 11 passed (11). Client: 8 files, Tests 26 passed (26). Both exit 0. README lists `npm run typecheck`. No install errors. Frontend `GET http://127.0.0.1:43123/` 200 in 1s. API `GET http://127.0.0.1:43124/api/health` 200 (also 200 via the Vite proxy). `GET /api/auth/me` 401. Startup warning: `JWT_SECRET is not set. Using a development secret. Set JWT_SECRET before sharing this server.` |

## Exact commands

Run from each cell root (`/tmp/cells/<cell>`):

```bash
npm install
npm test
npm run typecheck
npm start
```

`npm test` is the README suite for every cell. `npm run typecheck` is in the README for `app-mattpocock`, `feature-addyosmani`, `feature-mattpocock`, and `feature-superpowers`. For `app-addyosmani`, `app-pstack`, and `app-superpowers` it is only the `package.json` script. `app-superpowers` serves on `http://127.0.0.1:43117` (API `http://127.0.0.1:43118`); the other cells use 43123/43124.

Probes (after `npm start`, within 60s), then the process was stopped:

```bash
curl -sS -o /dev/null -w "%{http_code}" http://127.0.0.1:43123/
curl -sS -o /dev/null -w "%{http_code}" http://127.0.0.1:43124/api/health
curl -sS -o /dev/null -w "%{http_code}" http://127.0.0.1:43123/api/health
curl -sS -o /dev/null -w "%{http_code}" http://127.0.0.1:43124/api/auth/me
curl -sS -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:43124/api/auth/logout
```

No install errors. `npm install` exited 0 in every cell. npm also printed audit vulnerability counts and an npm-update notice; those are not install failures.
