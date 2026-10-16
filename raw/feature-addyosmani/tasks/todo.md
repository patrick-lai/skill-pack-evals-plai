# Tasks: Task comments

## Task 1: API tests for comments

**Description:** Add failing Supertest coverage for creating, listing, and deleting comments, plus the authorization and validation cases in `SPEC.md`.

**Acceptance criteria:**

- [x] A member can add a comment and list it with author and time
- [x] The author can delete it; another member cannot
- [x] Signed-out and non-member calls are rejected
- [x] Empty text is rejected
- [x] The task's `commentCount` follows the stored rows

**Verification:**

- [x] `npm run test --workspace=@quay/server -- test/api.test.ts` fails before the routes exist and passes after

**Dependencies:** None

**Files likely touched:**

- `server/test/api.test.ts`

**Estimated scope:** Small

## Task 2: Persist comments and serve the API

**Description:** Store comments in SQLite and expose the three routes. Attach `commentCount` to every task read.

**Acceptance criteria:**

- [x] Comments survive in the existing database file
- [x] Deleting a task deletes its comments
- [x] Only the author can delete a comment
- [x] Task payloads include `commentCount`

**Verification:**

- [x] Server test file passes
- [x] `npm run typecheck --workspace=@quay/server` passes

**Dependencies:** Task 1

**Files likely touched:**

- `server/src/db.ts`
- `server/src/data.ts`
- `server/src/schemas.ts`
- `server/src/app.ts`

**Estimated scope:** Medium

## Checkpoint: After Tasks 1-2

- [x] Server tests pass
- [x] Existing task behavior is unchanged

## Task 3: UI tests for count, author, and time

**Description:** Cover the card count and a comment thread that shows author and time and can add or delete.

**Acceptance criteria:**

- [x] The card shows zero and many comments in words
- [x] The thread shows the author and the comment time
- [x] Add submits the trimmed text
- [x] Delete is offered only for the current user's comments

**Verification:**

- [x] Client tests fail before the components render those states and pass after

**Dependencies:** Task 2 for the shared `Comment` type shape

**Files likely touched:**

- `client/src/components/TaskCard.test.tsx`
- `client/src/components/TaskComments.test.tsx`
- `client/src/components/BoardColumns.test.tsx`

**Estimated scope:** Small

## Task 4: Comment UI on the card and in the task dialog

**Description:** Show the count on each card. In the task dialog, list comments, add one, and delete your own. Update the open task's count without reloading the board.

**Acceptance criteria:**

- [x] Cards show the count from `task.commentCount`
- [x] Opening a saved task loads its comments, with loading, empty, and error states
- [x] Adding and deleting updates the list and the card count
- [x] A new unsaved task has no thread yet

**Verification:**

- [x] `npm test` passes
- [x] `npm run typecheck` passes

**Dependencies:** Tasks 2 and 3

**Files likely touched:**

- `client/src/types.ts`
- `client/src/lib/dates.ts`
- `client/src/components/TaskCard.tsx`
- `client/src/components/TaskComments.tsx`
- `client/src/components/TaskDialog.tsx`
- `client/src/pages/BoardPage.tsx`
- `README.md`

**Estimated scope:** Medium

## Checkpoint: Complete

- [x] All acceptance criteria in `SPEC.md` are met
- [x] Full test suite and typecheck pass
