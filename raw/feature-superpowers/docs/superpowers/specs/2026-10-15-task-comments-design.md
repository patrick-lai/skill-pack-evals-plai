# Task comments

## Intent

People on a Quay board talk about a task in the same place they edit it. A comment records who said it and when. The card on the board shows how many comments the task has, so a person scanning the columns can see which cards have discussion without opening them.

The request is: users can add and delete their own comments on a task, comments show author and time, each task card shows a comment count, comments persist in the existing SQLite database, and the change ships with API tests and UI tests. Existing tests keep passing.

## Goals

- A board member can add a comment to a task they can already see.
- A comment shows the author's name and the time it was written.
- The author can delete that comment. Nobody else can.
- Every task card shows a comment count, including zero.
- Comments live in the existing SQLite database and disappear when the task does.
- API tests and UI tests cover the new behavior. The current suite still passes.

## Non-goals

- Editing a comment.
- Threads, replies, reactions, or mentions.
- Commenting on a task that has not been saved yet.
- Real-time updates for someone else who has the board open.
- Pagination, search, or markdown rendering.

## Anti-goals

- A person who is not on the board can read or write comments.
- One member can delete another member's comment.
- The comment count on the card can disagree with the comments stored for that task.

## Constraints

- Stay on the current stack: Express, better-sqlite3, React, Vite, the existing session cookie.
- Follow the patterns already in `server/src` and `client/src`. Do not add a new library.
- Access matches tasks: a signed-in board member can read and add; everyone else gets the same 401 or 404 the task routes already return.
- Node.js 22 or newer, as the README already requires.

## What the user decided

- Add and delete their own comments on a task.
- Show author and time.
- Show a comment count on each task card.
- Persist in the existing database.
- Add API tests and UI tests.
- Keep existing tests passing.

## What the builder decided

These were not in the request. They are the calls that make the feature specific.

- Comments are plain text, trimmed, from 1 to 2000 characters. Empty or whitespace-only text is rejected with "Comment is required". Longer text is rejected with "Comment is too long".
- Any member of the task's board can read and add comments. Only the author can delete one. A different member gets 403 and "You can only delete your own comments".
- A missing task, a task on a board the caller is not on, or a comment that is not on that task is 404. Unsigned requests are 401 with "Sign in required".
- Comments are listed oldest first. A second comment appears under the first.
- The author is the user's name, the same way assignees are shown. The payload also includes the author's id and email, matching `PublicUser`.
- The time is an absolute UTC timestamp rendered as `Oct 15, 2026, 11:38 PM` (month short, day, year, 12-hour clock, minutes). It is not a relative "5m ago" string, so it does not change while the dialog is open.
- The count lives on the task as `commentCount`. Creating a task reports 0. The board payload includes the count for every task. The card always shows it: "0 comments", "1 comment", or "N comments".
- Comments are not embedded in the board payload. Opening a saved task loads them. A new, unsaved task has no comment section.
- The comment section sits in the task dialog, under the task fields: a list, a text box, and an Add comment button. Empty shows "No comments yet." Loading shows "Loading comments…". A failed load shows the error and a Retry button.
- Deleting a comment is one click, labeled for that author. There is no second confirm. The task's own delete confirm is unchanged.
- Removing a board member does not delete their comments. The author's name still shows.
- Deleting a task deletes its comments. Deleting a board does too, because tasks already cascade.
- No edit, no notifications, no rich text.

## How it is shaped

### Database

A new `comments` table, created with the rest of the schema in `openDatabase`:

- `id` text primary key
- `task_id` text not null, references `tasks(id)` on delete cascade
- `author_id` text not null, references `users(id)`
- `body` text not null
- `created_at` text not null
- index on `(task_id, created_at)`

`commentCount` is counted at read time. It is not a stored column.

### API

- `GET /api/tasks/:taskId/comments` → `{ comments: Comment[] }`
- `POST /api/tasks/:taskId/comments` with `{ body }` → `201 { comment }`
- `DELETE /api/tasks/:taskId/comments/:commentId` → `204`

`Comment` is `{ id, taskId, body, createdAt, author: { id, name, email } }`.

Task JSON, including create, update, and the tasks inside a board, gains `commentCount: number`.

### UI

`TaskCardView` shows the count beside the assignee.

`TaskComments` renders the list, the composer, and the loading, empty, and error states. `TaskDialog` includes it only when a saved task is open. `BoardPage` loads comments when that dialog opens, posts and deletes through the API, then reloads the comments and the board so the card count matches.

## Tests

API tests, in the existing supertest file, cover: count starts at 0; a member adds a comment and reads author, time, and order; the board's task count follows; the author deletes and the count drops; another member cannot delete; a non-member and a missing comment are 404; a signed-out caller is 401; an empty or oversized body is 400; deleting the task removes the comment rows.

UI tests cover: the card's "0 comments", "1 comment", and "2 comments"; the list shows author and the formatted time; Add comment calls the handler with the typed text and refuses an empty box; Delete is present only on the current user's comment and calls the handler; loading, empty, and error states render.
