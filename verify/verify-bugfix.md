# Cell verification

Verification only. Cell source was not edited. Nothing was committed or pushed. Archives were extracted under `/tmp/verify`. The base archive on disk is `uploads/start-base-bug_d175.tgz` (unpacks to `base-bug/`, commit `ed935e8` `base`).

## Results

| cell | server tests | client tests | typecheck | regression test name | fails on base-bug? |
| --- | --- | --- | --- | --- | --- |
| mattpocock | pass — 8 passed, 0 failed, 0 skipped | pass — 12 passed, 0 failed, 0 skipped | pass (exit 0) | `keeps the assignee when a task is moved to done` | yes — `AssertionError: expected { …(11) } to match object { status: 'done', …(2) }` (`assignee` / `assigneeId` received `null`) |
| pstack | pass — 9 passed, 0 failed, 0 skipped | pass — 12 passed, 0 failed, 0 skipped | pass (exit 0) | `keeps the assignee when a task is moved to done`; `keeps the assignee when the editor saves a task as done` | yes — both fail. First: `AssertionError: expected { …(11) } to match object { …(6) }`. Second: `AssertionError: expected { …(11) } to match object { status: 'done', …(2) }`. Both receive `assignee: null`, `assigneeId: null` |
| superpowers | pass — 8 passed, 0 failed, 0 skipped | pass — 12 passed, 0 failed, 0 skipped | pass (exit 0) | `keeps the assignee when a task is moved to done` | yes — `AssertionError: expected { …(11) } to match object { status: 'done', …(2) }` (`assignee` / `assigneeId` received `null`) |
| addyosmani | pass — 8 passed, 0 failed, 0 skipped | pass — 12 passed, 0 failed, 0 skipped | pass (exit 0) | `keeps the assignee when a task is moved to done` | yes — `AssertionError: expected { …(11) } to match object { status: 'done', position: +0, …(2) }` (`assignee` / `assigneeId` received `null`) |

Vitest prints `Tests N passed (N)` when nothing failed or skipped, so skipped is 0. Typecheck is `tsc --noEmit` (server) and `tsc -p tsconfig.app.json --pretty false` (client); both exited 0 with no diagnostics.

## Regression tests identified

`git diff ed935e8` (first commit, subject `base`) against each cell. The product regression is only an addition at the end of `server/test/api.test.ts`, inside `describe('boards and tasks')`. No client test file differs from `base`.

| cell | commit that added the test | cases added |
| --- | --- | --- |
| mattpocock | `06f6814` Keep a task's assignee when it moves to Done | 1 |
| pstack | `270ea88` Add a regression test for assignees on done tasks (`server/test/api.test.ts`, +88) | 2 |
| superpowers | `8c680c7` Keep a task's assignee when it moves to Done | 1 |
| addyosmani | `e6cb69d` Keep a task's assignee when it moves to Done | 1 |

The same diff also adds skill-pack files under `.cursor/skills/` (markdown, plus pstack's `poteto-mode` `*.test.ts` helpers). Those are not the Quay regression and were not copied onto the base app. `npm test` does not run them (server vitest only saw `test/api.test.ts`).

## Commands

README setup is `npm install` (not `npm ci`). Installs used `--no-audit --no-fund`; that does not change the package set. Node v22.14.0, npm 10.9.9.

Per cell, from the extracted repo root (`/tmp/verify/mattpocock`, `/tmp/verify/pstack`, `/tmp/verify/superpowers`, `/tmp/verify/addyosmani`):

```bash
npm install --no-audit --no-fund
npm test --workspace=@quay/server
npm test --workspace=@quay/client
npm run typecheck
```

`npm test` at the root is `npm run test --workspace=@quay/server && npm run test --workspace=@quay/client`. The two workspace commands were run separately so the counts stay split. Server script is `vitest run`. Client script is `vitest run`.

Regression on unpatched source, once per cell:

```bash
rm -rf /tmp/verify/onbase-<cell>
mkdir -p /tmp/verify/onbase-<cell>
tar -xzf /workspace/uploads/start-base-bug_d175.tgz -C /tmp/verify/onbase-<cell>
cp /tmp/verify/<cell>/server/test/api.test.ts /tmp/verify/onbase-<cell>/base-bug/server/test/api.test.ts
cd /tmp/verify/onbase-<cell>/base-bug
npm install --no-audit --no-fund
npm test --workspace=@quay/server -- -t "keeps the assignee"
```

npm ran `vitest run -t keeps the assignee`. That name filter matched only the new cases (7 pre-existing tests skipped). Exit code 1 for every cell.

On-base counts:

- mattpocock: 1 failed, 7 skipped (8)
- pstack: 2 failed, 7 skipped (9)
- superpowers: 1 failed, 7 skipped (8)
- addyosmani: 1 failed, 7 skipped (8)

Assertion site in each copied file: `expect(moved.body.task).toMatchObject(...)` (pstack's second case: `expect(saved.body.task).toMatchObject(...)`). PATCH `{ status: 'done' }` returns the task with `assignee` and `assigneeId` set to `null`.
