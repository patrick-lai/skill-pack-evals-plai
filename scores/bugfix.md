# Bug fix — blind scores (A-D)

All four make the same one-line root-cause fix in `updateTask` (server/src/data.ts): `const assigneeId = input.assigneeId === undefined ? existing.assigneeId : input.assigneeId;` (D only line-wraps it). No other source changes in any label; diffs are confined to data.ts and server/test/api.test.ts. Tests not run: no node_modules on the box, native sqlite build unavailable. Correctness scored from the diff.

| Label | Correctness | Code quality | Scope discipline | Verification | Craft | Total |
|---|---|---|---|---|---|---|
| A | 5: fix at root in updateTask, assignee only changes when explicitly sent | 4: clean; test reuses `task` for a response object, slightly muddy | 5: data.ts + one test, nothing else | 4: API test PATCHes status done, checks response and stored board; would fail on old code | 4: test "keeps the assignee when a task is moved to done" is clear | 22 |
| B | 5: same root fix | 4: same as A, tighter assignee literal | 5: data.ts + one test | 4: same test as A plus `position: 0` asserted; would fail on old code | 4: same clear test name | 22 |
| C | 5: same root fix | 5: clear names (`createdBoard`, `taskId`) | 5: data.ts + tests only | 5: covers move-to-done, edit while done, explicit `assigneeId: null` still clears, and full editor save as done | 5: second test "keeps the assignee when the editor saves a task as done" pins the real UI path | 25 |
| D | 5: same root fix | 4: fine; adds `board.status` check | 4: cosmetic reflow of the fixed line, harmless | 4: one move-to-done test, checks response + stored; omits `position`, so exercises the default-position path | 4: same clear test name | 21 |

**Strongest: C.** Only one that proves the fix doesn't over-correct: `const cleared = await ada.agent.patch(...).send({ assigneeId: null }); ... assignee: null`, and tests the dialog path: `'keeps the assignee when the editor saves a task as done'`.

**Weakest: D (narrowly).** Correct fix, single test, plus noise: `const assigneeId =\n    input.assigneeId === undefined ? existing.assigneeId : input.assigneeId;` is a pure reformat. A, B and D are near-identical; the spread is small.

**TEST_RESULTS.md note:** all four NOT RUN (better-sqlite3 has no prebuilt binary for node 22, no make/g++). No pass/fail data, so scores stand on the diff. No pack names in that file.

**Clean-env run (from Bench Lead):** all four pass every test and typecheck; every regression test fails on the unpatched code. Scores stand.
