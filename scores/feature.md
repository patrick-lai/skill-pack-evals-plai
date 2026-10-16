# Feature (task comments): blind scores (A-D)
process-notes/ folders were excluded for all four labels so the scoring stays blind. Only code, tests and README were scored.

Checked for all four: the `comments` table is in `server/src/db.ts` with `task_id ... REFERENCES tasks(id) ON DELETE CASCADE`, so comments persist and are removed when their task is deleted. `deleteComment` calls `getTaskForUser` (board access check) and then returns 403 for a non-author. The card count comes from SQL `SELECT COUNT(*) FROM comments`. No label asks for confirmation before deleting.

| Label | Correctness | Code quality | Scope discipline | Verification | Craft | Total |
|---|---|---|---|---|---|---|
| A | 5: access check + 403 (`data.ts:515-521`), cascade, count synced via `onCommentCount` (`TaskDialog.tsx:84`) | 4: small, consistent data/route/component split | 5: touches only what the brief needs | 4: API test for another user's delete returning 403 (`api.test.ts:315`); 10+20 tests pass | 4: "No comments yet", label on the delete button, "No comments" on the card; no delete confirm | 22 |
| B | 5: access check + 403 (`data.ts:517-523`), deletes in a transaction and checks `changes`, count synced via `applyCommentCount` (`BoardPage.tsx:117`) | 4: separate `CommentThread` component, careful row checks | 4: also changes `db.ts` beyond the table itself (`diff` shows 18 changed files, the most) | 3: 403 test present (`api.test.ts:342`), but fewest tests: 8+18 pass | 3: card hides the label at 0 comments (`commentCountLabel` returns null), no empty-state text found, no delete confirm | 19 |
| C | 5: access check + 403 (`data.ts:503-509`), cascade, comment state managed in `BoardPage` | 4: clean, though `DELETE ... WHERE id = ?` (`data.ts:511`) drops the task_id guard that the lookup uses | 5: on brief | 5: 403 test (`api.test.ts:353`) and the most tests: 11+26 pass | 4: "No comments yet.", `aria-label="Comments"`, label names the author on delete; no confirm | 23 |
| D | 5: access check + 403 (`data.ts:515-521`), cascade, count rendered from state | 4: same structure as C; `DELETE ... WHERE id = ?` (`data.ts:523`) | 5: smallest diff (14 files) | 4: 403 test for another user's delete (`api.test.ts:327`); 12+18 pass | 4: empty state, delete label reads "Delete your comment: …"; no confirm | 22 |

**Strongest: C (23).** It has the broadest verification ("expect(denied.status).toBe(403)", 11 server + 26 client tests passing), server-side enforcement ("You can only delete your own comments") and a clear empty state ("No comments yet.").

**Weakest: B (19).** It is functionally correct and the most defensive on delete ("if (result.changes !== 1) throw new HttpError(404 ..."), but it has the widest diff, the fewest passing tests (8+18), and no visible empty state on the card.

No label has a real correctness bug. Minor: C and D run the final `DELETE` by id only (`C data.ts:511`, `D data.ts:523`), which is safe because the task_id lookup just before it already guards it.

Clean-env run: A 10+20, B 8+18, C 11+26, D 12+18. All pass, typecheck and start.
