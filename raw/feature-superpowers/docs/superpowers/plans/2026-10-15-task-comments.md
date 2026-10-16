# Task comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Board members can add and delete their own comments on a task, each comment shows the author and time, and every task card shows a comment count, persisted in the existing SQLite database.

**Architecture:** A `comments` table cascades with its task. Task reads gain a counted `commentCount`. Three task-scoped routes list, create, and delete comments, using the same membership checks as tasks. The card renders the count; the task dialog loads and edits comments only for a saved task.

**Tech Stack:** Express, better-sqlite3, Zod, React, Vite, Vitest, Testing Library, supertest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-15-task-comments-design.md`

## Global Constraints

- Stay on Express, better-sqlite3, React, Vite, and the existing session cookie.
- Follow the patterns already in `server/src` and `client/src`. Do not add a new library.
- A signed-in board member can read and add; everyone else gets the same 401 or 404 the task routes already return.
- Node.js 22 or newer.
- Comments are plain text, trimmed, from 1 to 2000 characters.
- Empty or whitespace-only text is "Comment is required". Longer text is "Comment is too long".
- Only the author can delete. Anyone else who can see the task gets 403 and "You can only delete your own comments".
- A missing task, a task the caller cannot see, or a comment that is not on that task is 404. Unsigned requests are 401 with "Sign in required".
- Comments list oldest first.
- Time renders in UTC as `Oct 15, 2026, 11:38 PM`.
- The card always shows "0 comments", "1 comment", or "N comments".
- A new unsaved task has no comment section.
- Deleting a task deletes its comments. Removing a member does not delete their comments.

## Review Focus

- A delete URL that names a comment from a different task must 404 and leave that comment in place.
- After a member is removed, their existing comment still lists with their name.
- A whitespace-only body is rejected and stored nowhere.
- Deleting a task removes the comment rows, not only the task route.
- The card says "1 comment" for a single comment and "0 comments" or "2 comments" otherwise.

---

### Task 1: Store comments and report the count

**Files:**
- Modify: `server/src/db.ts`
- Modify: `server/src/schemas.ts`
- Modify: `server/src/data.ts`
- Modify: `server/src/app.ts`
- Test: `server/test/api.test.ts`

**Interfaces:**
- Consumes: `getTaskForUser(db, taskId, userId)`, `PublicUser`, `parseBody`, `requireUser`
- Produces:
  - `commentSchema` — Zod object `{ body: string }` trimmed, length 1–2000
  - `Comment` — `{ id: string; taskId: string; body: string; createdAt: string; author: { id: string; name: string; email: string } }`
  - `Task.commentCount: number` on every task JSON object
  - `listComments(db, taskId, userId): Comment[]`
  - `createComment(db, taskId, userId, body): Comment`
  - `GET /api/tasks/:taskId/comments` → `{ comments }`
  - `POST /api/tasks/:taskId/comments` → `201 { comment }`

- [ ] **Step 1: Write the failing test**

Add a `describe('comments')` block in `server/test/api.test.ts` with the same `register` helper the boards describe uses, plus:

```typescript
it('starts a task at zero comments', async () => {
  const ada = await register('ada@example.com', 'Ada Lovelace');
  const created = await ada.agent.post('/api/boards').send({ name: 'Dock' });
  const boardId = created.body.board.id as string;
  const task = await ada.agent.post(`/api/boards/${boardId}/tasks`).send({ title: 'Coil the line' });
  expect(task.status).toBe(201);
  expect(task.body.task.commentCount).toBe(0);

  const listed = await ada.agent.get(`/api/tasks/${task.body.task.id}/comments`);
  expect(listed.status).toBe(200);
  expect(listed.body.comments).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@quay/server -- test/api.test.ts -t "starts a task at zero comments"`

Expected: FAIL because `commentCount` is not 0 (it is undefined) or the comments route is 404.

- [ ] **Step 3: Implement the empty list and a zero count**

In `server/src/db.ts`, add:

```sql
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id, created_at);
```

Add `comment_count` to `TASK_SELECT` as `(SELECT COUNT(*) FROM comments c WHERE c.task_id = t.id) AS comment_count`, and set `commentCount` in `presentTask`. Add `listComments` that calls `getTaskForUser` and returns `[]` when there are no rows. Add `GET /api/tasks/:taskId/comments`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@quay/server -- test/api.test.ts -t "starts a task at zero comments"`

Expected: PASS

- [ ] **Step 5: Write the failing test**

```typescript
it('stores a trimmed comment and lists comments oldest first', async () => {
  const ada = await register('ada@example.com', 'Ada Lovelace');
  const created = await ada.agent.post('/api/boards').send({ name: 'Dock' });
  const boardId = created.body.board.id as string;
  const task = await ada.agent.post(`/api/boards/${boardId}/tasks`).send({ title: 'Coil the line' });
  const taskId = task.body.task.id as string;

  const first = await ada.agent.post(`/api/tasks/${taskId}/comments`).send({
    body: '  The tide turns at four.  ',
  });
  expect(first.status).toBe(201);
  expect(first.body.comment).toMatchObject({
    taskId,
    body: 'The tide turns at four.',
    author: { id: ada.user.id, name: 'Ada Lovelace', email: 'ada@example.com' },
  });
  expect(first.body.comment.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

  const second = await ada.agent
    .post(`/api/tasks/${taskId}/comments`)
    .send({ body: 'Bring the spare warp.' });
  expect(second.status).toBe(201);

  const listed = await ada.agent.get(`/api/tasks/${taskId}/comments`);
  expect(listed.body.comments.map((comment: { body: string }) => comment.body)).toEqual([
    'The tide turns at four.',
    'Bring the spare warp.',
  ]);

  const board = await ada.agent.get(`/api/boards/${boardId}`);
  const found = (board.body.board.tasks as { id: string; commentCount: number }[]).find(
    (item) => item.id === taskId,
  );
  expect(found?.commentCount).toBe(2);
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test --workspace=@quay/server -- test/api.test.ts -t "lists comments oldest first"`

Expected: FAIL because POST is 404.

- [ ] **Step 7: Implement `commentSchema`, `createComment`, and POST**

`commentSchema` trims `body`, min 1 with "Comment is required", max 2000 with "Comment is too long". `createComment` inserts a uuid and ISO timestamp for the signed-in user after `getTaskForUser`, and returns the joined comment. `POST /api/tasks/:taskId/comments` responds 201 `{ comment }`. List orders by `created_at`, then `id`.

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test --workspace=@quay/server -- test/api.test.ts -t "lists comments oldest first"`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add server/src/db.ts server/src/schemas.ts server/src/data.ts server/src/app.ts server/test/api.test.ts
git commit -m "feat: store task comments and report the count"
```

### Task 2: Refuse the comments a member must not change

**Files:**
- Modify: `server/src/data.ts`
- Modify: `server/src/app.ts`
- Test: `server/test/api.test.ts`

**Interfaces:**
- Consumes: `createComment`, `listComments`, `commentSchema`, `getTaskForUser`
- Produces: `deleteComment(db, taskId, userId, commentId): void` and `DELETE /api/tasks/:taskId/comments/:commentId` → 204

- [ ] **Step 1: Write the failing test**

```typescript
it('lets the author delete a comment and refuses everyone else', async () => {
  const ada = await register('ada@example.com', 'Ada Lovelace');
  const grace = await register('grace@example.com', 'Grace Hopper');
  const stranger = await register('alan@example.com', 'Alan Turing');
  const created = await ada.agent.post('/api/boards').send({ name: 'Dock' });
  const boardId = created.body.board.id as string;
  await ada.agent.post(`/api/boards/${boardId}/members`).send({ email: 'grace@example.com' });
  const task = await ada.agent.post(`/api/boards/${boardId}/tasks`).send({ title: 'Coil the line' });
  const taskId = task.body.task.id as string;
  const other = await ada.agent.post(`/api/boards/${boardId}/tasks`).send({ title: 'Other' });
  const otherId = other.body.task.id as string;

  const comment = await grace.agent
    .post(`/api/tasks/${taskId}/comments`)
    .send({ body: 'The warp is frayed.' });
  expect(comment.status).toBe(201);
  const commentId = comment.body.comment.id as string;

  const kept = await ada.agent.post(`/api/tasks/${otherId}/comments`).send({ body: 'Stay put.' });

  expect((await request(app).get(`/api/tasks/${taskId}/comments`)).status).toBe(401);
  expect((await request(app).post(`/api/tasks/${taskId}/comments`).send({ body: 'No' })).status).toBe(401);
  expect((await request(app).delete(`/api/tasks/${taskId}/comments/${commentId}`)).status).toBe(401);

  expect((await stranger.agent.get(`/api/tasks/${taskId}/comments`)).status).toBe(404);
  expect((await stranger.agent.post(`/api/tasks/${taskId}/comments`).send({ body: 'No' })).status).toBe(404);

  const blank = await grace.agent.post(`/api/tasks/${taskId}/comments`).send({ body: '   ' });
  expect(blank.status).toBe(400);
  expect(blank.body.error).toBe('Comment is required');
  const huge = await grace.agent
    .post(`/api/tasks/${taskId}/comments`)
    .send({ body: 'x'.repeat(2001) });
  expect(huge.status).toBe(400);
  expect(huge.body.error).toBe('Comment is too long');

  const denied = await ada.agent.delete(`/api/tasks/${taskId}/comments/${commentId}`);
  expect(denied.status).toBe(403);
  expect(denied.body.error).toBe('You can only delete your own comments');

  const wrongTask = await grace.agent.delete(`/api/tasks/${otherId}/comments/${commentId}`);
  expect(wrongTask.status).toBe(404);
  const stillThere = await ada.agent.get(`/api/tasks/${taskId}/comments`);
  expect(stillThere.body.comments).toHaveLength(1);

  const removed = await grace.agent.delete(`/api/tasks/${taskId}/comments/${commentId}`);
  expect(removed.status).toBe(204);
  const after = await ada.agent.get(`/api/tasks/${taskId}/comments`);
  expect(after.body.comments).toEqual([]);
  const board = await ada.agent.get(`/api/boards/${boardId}`);
  const found = (board.body.board.tasks as { id: string; commentCount: number }[]).find(
    (item) => item.id === taskId,
  );
  expect(found?.commentCount).toBe(0);

  const leftover = await ada.agent.get(`/api/tasks/${otherId}/comments`);
  expect(leftover.body.comments.map((item: { id: string }) => item.id)).toEqual([
    kept.body.comment.id,
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@quay/server -- test/api.test.ts -t "refuses everyone else"`

Expected: FAIL on the first missing behavior (blank body still 201, or delete 404).

- [ ] **Step 3: Implement `deleteComment` and the validation already declared by `commentSchema`**

`deleteComment` loads the task through `getTaskForUser`. If no comment with that id exists on that task, throw 404 "Comment not found". If `author_id` is not `userId`, throw 403 "You can only delete your own comments". Otherwise delete the row. Wire `DELETE /api/tasks/:taskId/comments/:commentId` to 204. Blank and oversized bodies stay on `commentSchema` from Task 1; do not add a second validator.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@quay/server -- test/api.test.ts -t "refuses everyone else"`

Expected: PASS

- [ ] **Step 5: Write the failing test**

```typescript
it('keeps a removed member's comment and drops comments when the task is deleted', async () => {
  const ada = await register('ada@example.com', 'Ada Lovelace');
  const grace = await register('grace@example.com', 'Grace Hopper');
  const created = await ada.agent.post('/api/boards').send({ name: 'Dock' });
  const boardId = created.body.board.id as string;
  await ada.agent.post(`/api/boards/${boardId}/members`).send({ email: 'grace@example.com' });
  const task = await ada.agent.post(`/api/boards/${boardId}/tasks`).send({ title: 'Coil the line' });
  const taskId = task.body.task.id as string;
  await grace.agent.post(`/api/tasks/${taskId}/comments`).send({ body: 'I logged the warp.' });

  await ada.agent.delete(`/api/boards/${boardId}/members/${grace.user.id}`).expect(204);
  const listed = await ada.agent.get(`/api/tasks/${taskId}/comments`);
  expect(listed.body.comments).toHaveLength(1);
  expect(listed.body.comments[0].author.name).toBe('Grace Hopper');

  await ada.agent.delete(`/api/tasks/${taskId}`).expect(204);
  const count = app.locals.db
    .prepare('SELECT COUNT(*) AS count FROM comments')
    .get() as { count: number };
  expect(count.count).toBe(0);
});
```

The apostrophe in the test name must be a normal single-quoted string or a template-free double-quoted name: `it("keeps a removed member's comment and drops comments when the task is deleted", ...)`.

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test --workspace=@quay/server -- test/api.test.ts -t "removed member"`

Expected: FAIL because the comment row is still present after the task delete, or the removed member's comment is gone. If both already hold, the test is not red: delete the cascade or the member-removal assumption in production until this test fails, then restore the spec behavior. Do not leave a test that passed on first run.

- [ ] **Step 7: Confirm cascade and retained authorship**

Foreign keys are already on. `comments.task_id` references `tasks(id) ON DELETE CASCADE`, so deleting the task deletes the rows. Do not delete comments in `removeMember`. If step 6 failed for another reason, fix that cause only.

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test --workspace=@quay/server -- test/api.test.ts -t "removed member"`

Expected: PASS

- [ ] **Step 9: Run the server suite**

Run: `npm test --workspace=@quay/server`

Expected: PASS, including the existing boards test.

- [ ] **Step 10: Commit**

```bash
git add server/src/data.ts server/src/app.ts server/test/api.test.ts
git commit -m "feat: let authors delete their own comments"
```

### Task 3: Show the comment count on the card

**Files:**
- Modify: `client/src/types.ts`
- Modify: `client/src/components/TaskCard.tsx`
- Modify: `client/src/components/TaskCard.test.tsx`
- Modify: `client/src/components/BoardColumns.test.tsx`

**Interfaces:**
- Consumes: `Task` from `client/src/types.ts`
- Produces: `Task.commentCount: number`. `TaskCardView` renders "0 comments", "1 comment", or "N comments".

- [ ] **Step 1: Write the failing test**

Add `commentCount` to the fixtures in `TaskCard.test.tsx` and `BoardColumns.test.tsx`. In `TaskCard.test.tsx`:

```typescript
it('shows zero comments, one comment, and many comments', () => {
  const { rerender } = render(<TaskCardView task={{ ...task, commentCount: 0 }} />);
  expect(screen.getByText('0 comments')).toBeInTheDocument();

  rerender(<TaskCardView task={{ ...task, commentCount: 1 }} />);
  expect(screen.getByText('1 comment')).toBeInTheDocument();

  rerender(<TaskCardView task={{ ...task, commentCount: 2 }} />);
  expect(screen.getByText('2 comments')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@quay/client -- src/components/TaskCard.test.tsx`

Expected: FAIL because "0 comments" is not in the document.

- [ ] **Step 3: Implement the count on `TaskCardView`**

Add `commentCount: number` to the client `Task` type. In the card's meta row, render the singular or plural text from `task.commentCount`. Use a `MessageSquare` icon. Update the `BoardColumns` fixture with `commentCount: 0`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@quay/client -- src/components/TaskCard.test.tsx src/components/BoardColumns.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/types.ts client/src/components/TaskCard.tsx client/src/components/TaskCard.test.tsx client/src/components/BoardColumns.test.tsx
git commit -m "feat: show a comment count on each task card"
```

### Task 4: Add and delete comments from the task dialog

**Files:**
- Modify: `client/src/lib/dates.ts`
- Modify: `client/src/lib/dates.test.ts`
- Create: `client/src/components/TaskComments.tsx`
- Create: `client/src/components/TaskComments.test.tsx`
- Modify: `client/src/types.ts`
- Modify: `client/src/components/TaskDialog.tsx`
- Create: `client/src/components/TaskDialog.test.tsx`
- Modify: `client/src/pages/BoardPage.tsx`
- Modify: `README.md`
- Test: `client/src/components/TaskComments.test.tsx`
- Test: `client/src/components/TaskDialog.test.tsx`

**Interfaces:**
- Consumes: `Comment` added to `client/src/types.ts` as `{ id: string; taskId: string; body: string; createdAt: string; author: User }`
- Produces:
  - `formatCommentTime(iso: string): string`
  - `TaskComments` props: `{ status: 'loading' | 'ready' | 'error'; comments: Comment[]; error: string | null; currentUserId: string; onAdd: (body: string) => Promise<void>; onDelete: (commentId: string) => Promise<void>; onRetry: () => void }`
  - `TaskDialog` optional `comments` prop with those fields. Omitted, or rendered only when `task` is non-null.

- [ ] **Step 1: Write the failing test**

```typescript
it('formats a comment time in UTC', () => {
  expect(formatCommentTime('2026-10-15T23:38:00.000Z')).toBe('Oct 15, 2026, 11:38 PM');
  expect(formatCommentTime('2026-10-15T00:05:00.000Z')).toBe('Oct 15, 2026, 12:05 AM');
  expect(formatCommentTime('not-a-time')).toBe('Unknown time');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@quay/client -- src/lib/dates.test.ts`

Expected: FAIL because `formatCommentTime` is not defined.

- [ ] **Step 3: Implement `formatCommentTime`**

Format with UTC month abbreviations, day, year, and a 12-hour clock. Return "Unknown time" when the input is not a date. No locale API.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@quay/client -- src/lib/dates.test.ts`

Expected: PASS

- [ ] **Step 5: Write the failing tests**

In `client/src/components/TaskComments.test.tsx`, cover:

- ready + one comment by Ada at `2026-10-15T23:38:00.000Z` and `currentUserId` of Ada: text "Ada Lovelace", "Oct 15, 2026, 11:38 PM", and a button "Delete comment from Ada Lovelace"
- ready + a comment by Grace and `currentUserId` of Ada: no "Delete comment from Grace Hopper"
- ready + no comments: "No comments yet."
- status `loading`: "Loading comments…"
- status `error` and `error` "Could not load comments": an alert with that text, and Retry calls `onRetry`
- typing "The tide turns at four." and clicking "Add comment" calls `onAdd` with that string
- clicking "Add comment" with an empty box does not call `onAdd` and shows "Comment is required"
- clicking "Delete comment from Ada Lovelace" calls `onDelete` with the comment id

In `client/src/components/TaskDialog.test.tsx`:

- `task` null: no "Add comment" button
- `task` set and `comments` ready with Ada's comment: "Ada Lovelace" is shown

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test --workspace=@quay/client -- src/components/TaskComments.test.tsx`

Expected: FAIL because the module does not exist.

- [ ] **Step 7: Implement `TaskComments` and mount it in `TaskDialog`**

The list shows the body, the author name, and `formatCommentTime`. Delete is a button only when `comment.author.id === currentUserId`, with `aria-label` `Delete comment from ${name}`. The composer is a labeled textarea "Comment" and a button "Add comment". Empty or whitespace submits nothing and sets "Comment is required". Loading, empty, and error copy are the strings in step 5.

`TaskDialog` renders `TaskComments` under the task form only when `task` and `comments` are both set. A new task does not show the composer.

`BoardPage`, when opening an existing task, loads `GET /api/tasks/:id/comments`. Add posts `{ body }` and delete calls `DELETE /api/tasks/:id/comments/:commentId`. After either one, reload the comments and the board. A failed load sets the error status and "Could not load comments" unless the API returned its own message. Retry runs the load again.

In the README sentence that lists task fields, add that a task can have comments.

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test --workspace=@quay/client`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add client/src/lib/dates.ts client/src/lib/dates.test.ts client/src/types.ts client/src/components/TaskComments.tsx client/src/components/TaskComments.test.tsx client/src/components/TaskDialog.tsx client/src/components/TaskDialog.test.tsx client/src/pages/BoardPage.tsx README.md
git commit -m "feat: add and delete comments from the task dialog"
```
