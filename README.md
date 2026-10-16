# Skill-pack benchmark

## Method

Four skill packs were each run on the same four tasks (video, app, feature, bugfix), giving 16 cells. Every cell used Grok 4.7 with the same task prompt (see `PROMPTS.md`), in a fresh checkout with only that one pack installed. The feature and bugfix tasks started from the same frozen, neutral base app (`raw/base/`). Outputs were anonymised as A to D (pack names, pack-named files and process notes scrubbed, labels reshuffled per task) and scored by a blind judge on five criteria (correctness, code quality, scope discipline, verification, craft), each 1 to 5, for a total out of 25. Test suites for the app, feature and bugfix outputs were then run in a clean cloud environment to check the judge's code-only reading. Label-to-pack mappings are in `mappings/`, full judge notes in `scores/`, and test runs in `verify/`.

Pack versions: pstack `850d7f2e` (0.15.25), superpowers `bb92a777`, Matt Pocock skills `49dd158d`, Addy Osmani skills `aeac41d4`.

## Results (out of 25 per task)

| Pack | Video | App | Feature | Bugfix | Total (/100) |
|---|---|---|---|---|---|
| Addy Osmani skills | 21 | 24 | 22 | 22 | 89 |
| superpowers | 22 | 22 | 23 | 22 | 89 |
| Matt Pocock skills | 21 | 20 | 22 | 21 | 84 |
| pstack | 20 | 19 | 19 | 25 | 83 |

## Per-criterion scores

Criteria: Corr = correctness, Code = code quality, Scope = scope discipline, Verif = verification, Craft = craft.

### Video

| Pack | Corr | Code | Scope | Verif | Craft | Total |
|---|---|---|---|---|---|---|
| Addy Osmani skills | 5 | 4 | 4 | 3 | 5 | 21 |
| superpowers | 5 | 5 | 4 | 5 | 3 | 22 |
| pstack | 5 | 4 | 5 | 4 | 2 | 20 |
| Matt Pocock skills | 5 | 4 | 5 | 4 | 3 | 21 |

### App

| Pack | Corr | Code | Scope | Verif | Craft | Total |
|---|---|---|---|---|---|---|
| Addy Osmani skills | 5 | 5 | 4 | 5 | 5 | 24 |
| superpowers | 5 | 4 | 5 | 5 | 3 | 22 |
| pstack | 3 | 5 | 4 | 3 | 4 | 19 |
| Matt Pocock skills | 5 | 3 | 5 | 3 | 4 | 20 |

### Feature

Not yet scored.

### Bugfix

| Pack | Corr | Code | Scope | Verif | Craft | Total |
|---|---|---|---|---|---|---|
| Addy Osmani skills | 5 | 4 | 5 | 4 | 4 | 22 |
| superpowers | 5 | 4 | 5 | 4 | 4 | 22 |
| pstack | 5 | 5 | 5 | 5 | 5 | 25 |
| Matt Pocock skills | 5 | 4 | 4 | 4 | 4 | 21 |

All four bugfix outputs made the same one-line root-cause fix; scores differ only on the tests written.

## Where each pack is strong / weak

### Addy Osmani skills
- Strong: the most complete app. Session expiry is enforced in SQL ("WHERE s.id = ? AND s.expires_at > ?"), with real keyboard drag ("useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })") and the broadest tests ("four API test files ... ~24 cases").
- Strong: the best-looking video: "no glitches on playback; scattered notes snap into a list at 0:03-0:04 with clean easing".
- Weak: video verification: "one timeline test; MP4 check left as a manual `ffprobe` instruction".

### superpowers
- Strong: video engineering and self-checks: "four test files + `npm run verify` checks 1080p/H.264/12-15s".
- Weak: video motion: "motion is stiff and linear: drag at 0:06 has no easing or shadow".
- Weak: no keyboard drag in the app: "only `PointerSensor` (`Kanban.tsx:35`)". It did test session expiry directly ("treats an expired session as signed out").

### pstack
- Strong: the most thorough bugfix, and the only one that checks the fix doesn't over-correct: "covers move-to-done, edit while done, explicit `assigneeId: null` still clears, and full editor save as done".
- Weak: app security gap: "sessions never expire: no expiry column (`server/src/db.ts:36-37`) and the cookie has no maxAge", with "only 3 API tests".
- Weak: a visible defect in the delivered video: "'Nothing waiting.' renders on top of the struck-through 'Book the 4pm train' at 0:11".

### Matt Pocock skills
- Strong: lean scope. The app was "lean, no extras" and stored session tokens hashed ("session tokens stored hashed (sha256)").
- Weak: app structure: "whole API in one `server/src/app.ts` (~500+ lines) and the UI in one `App.tsx`", with "6 API tests + 5 UI tests", so coverage is shallower.
- Weak: video polish: "typo 'Cel' typed at 0:03 ... logo flashes as an unstyled grey box at 0:11".

## Caveats

- Token use was not measured for any cell.
- pstack runs spawned extra sub-agents; their cost was not logged.
- The video-pstack run fetched a GitHub clone of pstack before being pinned to `850d7f2e`. The log says the clone was deleted and not used, but the run continued in the same checkout rather than restarting.
- The Matt Pocock app run errored on its first attempt and was rerun.
- n = 1 per cell. Differences of a point or two are within noise.
- Anonymisation once deleted a spec file from the Addy Osmani video output because it named the pack. The judge rescored without penalising the missing file (correctness 4 to 5). Later tasks replaced such files with `[REDACTED]` stubs instead.
- The feature task is not yet scored; feature-pstack had not landed at publish time.

## Feature task (task comments)

Scored on code, tests and README only (process notes excluded for all four after a workflow fingerprint was found). All four pass their tests on a clean machine.

| Pack | Score | Clean-env tests (server / client) | Notes |
|---|---|---|---|
| superpowers | 23 | 11 / 26 | Most tests, including a 403 test for deleting another user's comment; "No comments yet." empty state. |
| Addy Osmani skills | 22 | 10 / 20 | Solid, no bugs. |
| Matt Pocock skills | 22 | 12 / 18 | Solid, no bugs. |
| pstack | 19 | 8 / 18 | Widest diff (18 files), fewest tests, no empty state, no count shown at 0 comments. |

All four persist comments with cascade delete and enforce author-only delete on the server; none confirms before deleting. Full notes in `scores/feature.md`.

## Caveats on cost and margins

- Token cost couldn't be logged for any run, so the scores compare quality only. Wall-clock time varied a lot: pstack's feature run took 85 minutes against 10 to 32 for the other packs, and its app run took 39 minutes. It also started extra cloud agents for reviews and alternative designs.
- Each pack ran each task once. The spread from first to last is 6 points out of 100, which one rerun could flip. On the bug fix, all four packs made the same one-line fix, so the scores there differ only because of the tests. The clearest real differences are in the app task: one app's sessions never expire, and only one supports keyboard drag.

## Appendix: what people said on X (mid-Aug to mid-Oct 2026)

X only; Reddit, HN and GitHub not covered, and links weren't opened to check them.

- superpowers: most praised for plan-first, enforced TDD and parallel subagents ([@KinanHamwi](https://x.com/KinanHamwi/status/2091341955833704605)). Some ask whether newer models make it unnecessary.
- Matt Pocock: positive, mostly about /grill-me and small composable skills ([@johann_sath](https://x.com/johann_sath/status/2091242411657724404)).
- Addy Osmani: positive, spec-first; v0.6.12 pauses for a human after saving a spec ([@byCanen](https://x.com/byCanen/status/2108500573141991434)).
- pstack: /poteto-mode liked, but said to work best in Cursor and to burn tokens ([@velvet_shark](https://x.com/velvet_shark/status/2094729199445508338), [@T1redDeveloper](https://x.com/T1redDeveloper/status/2104188633846591923)), consistent with its slow, agent-heavy runs here.
