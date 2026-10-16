# Spec: Task comments

## Objective

Board members can discuss a task in place. A member adds a comment, sees who wrote each comment and when, and deletes only their own. Every task card shows how many comments that task has. Comments persist in the existing SQLite database.

Success for a member:

- Open a saved task and add a comment. It appears with their name and the time it was written.
- See comments left by other members of the same board.
- Delete a comment they wrote. The comment disappears and the card count drops.
- They cannot delete someone else's comment.
- Someone who is not on the board cannot read or write the thread.

## Tech Stack

- Client: React 19, TypeScript, Vite, Tailwind, existing shadcn-style components
- Server: Node 22, Express, Zod, better-sqlite3
- Tests: Vitest, Supertest, Testing Library

## Commands

```bash
npm install
npm test
npm run typecheck
npm start
```

Focused tests:

```bash
npm run test --workspace=@quay/server -- test/api.test.ts
npm run test --workspace=@quay/client -- src/components/TaskCard.test.tsx src/components/TaskComments.test.tsx
```

## Project Structure

```
server/src/db.ts          SQLite schema, including comments
server/src/data.ts        Comment queries and task comment counts
server/src/schemas.ts     Comment body validation
server/src/app.ts         Comment routes
server/test/api.test.ts   API tests
client/src/types.ts       Task.commentCount and Comment
client/src/components/    Task card count and comment thread UI
client/src/pages/BoardPage.tsx  Keeps card counts in sync
SPEC.md                   This spec
tasks/plan.md             Implementation plan
tasks/todo.md             Task checklist
```

## Code Style

Match the existing modules. Server functions take `(db, ids, userId, input)` and throw `HttpError`. Routes parse with Zod, then call those functions. The client renders text through React, uses the existing field and button components, and names tests after the behavior.

```ts
export function createComment(db: DB, taskId: string, userId: string, body: string): Comment {
  getTaskForUser(db, taskId, userId);
  // insert, then return the comment with its author
}
```

## API contract

Comment:

```ts
{
  id: string;
  taskId: string;
  body: string;
  createdAt: string; // ISO-8601
  author: { id: string; name: string; email: string };
}
```

Task gains one field: `commentCount: number`. Existing task fields stay as they are.

| Method | Path | Success | Errors |
| --- | --- | --- | --- |
| GET | `/api/tasks/:taskId/comments` | 200 `{ comments }` oldest first | 401 signed out, 404 not a member or missing task |
| POST | `/api/tasks/:taskId/comments` | 201 `{ comment }` body `{ body }` | 400 invalid body, 401, 404 |
| DELETE | `/api/tasks/:taskId/comments/:commentId` | 204 | 401, 403 not the author, 404 missing or wrong task |

The author is always the signed-in user. The client cannot set it.

## Testing Strategy

- API tests hit the real Express app and a temporary SQLite file, same as the current suite.
- UI tests render `TaskCardView` and `TaskComments` with Testing Library. They assert author, time, count, add, and delete. They do not mock the database.
- `npm test` must stay green, including the tests that already exist.

## Boundaries

- Always: validate comment text at the route, parameterize SQL, authorize board membership on every comment request, escape comment text by rendering it as React text.
- Ask first: new auth mechanisms, new dependencies, a second database.
- Never: let a member delete another person's comment, trust a client-supplied author id, log comment bodies, or drop existing tests to go green.

## Success Criteria

- A board member can add a comment and read it back with author name and `createdAt`.
- The author can delete that comment. Another member of the same board receives 403 and the comment remains.
- A signed-out request receives 401. A signed-in non-member receives 404.
- An empty or oversized comment receives 400.
- After a comment is added or deleted, `commentCount` on that task matches the stored rows.
- Each task card shows the count, including zero.
- Deleting a task removes its comments.
- `npm test` and `npm run typecheck` pass.

## Assumptions

1. Any board member may read and add comments. Only the author may delete one, including when the author is not the board owner.
2. Comment text is required after trim, at most 2000 characters.
3. Comments are available on saved tasks. A task that has not been saved yet has no thread.
4. `commentCount` is returned on every task payload so the card does not need a second request.
5. The new table is created with the existing startup schema (`CREATE TABLE IF NOT EXISTS`). There is no separate migration runner.
6. This session is non-interactive. The task prompt is the approval to specify, plan, and implement in one pass.

## Open Questions

None remaining. The prompt fixes the user-visible behavior, and the assumptions above fix the access rules the prompt left implicit.
