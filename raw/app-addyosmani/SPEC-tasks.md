# Spec: tasks

## Objective

On a board, members track work as cards with a title, description, status (`todo`, `doing`, or `done`), an assignee, and a due date. Dragging a card to another column changes its status. Order inside a column is kept.

## Commands

Same as `SPEC-identity.md`. UI tests run with `npm run test -w @bench/client`.

## Project Structure

```
shared/src/move.ts                         Pure reorder used by API and UI
server/src/routes/tasks.ts                 Task routes under a board
client/src/components/BoardView.tsx        Loads a board and saves changes
client/src/components/BoardColumns.tsx     Columns, drag, empty states
client/src/components/TaskDialog.tsx       Create and edit
```

## Code Style

```ts
export function planMove<T extends Movable>(
  items: T[],
  taskId: string,
  toStatus: Status,
  toIndex: number,
): T[]
```

Status values stay `todo` | `doing` | `done` because the task prompt names those exact words.

## Testing Strategy

- Unit: `planMove` reorders inside a column and moves across columns.
- API: create, validation, assignee must be a member, patch status and position, delete, and a non-member receives 404.
- UI: auth form submits and shows errors; columns group cards by status; the move control reports the destination; empty and error states render.

Drag-and-drop itself is covered by `planMove` plus the API. The board is also exercised in a browser.

## Boundaries

- Always: status is one of the three values; assignee is a member or empty; due date is `YYYY-MM-DD` or empty.
- Ask first: comments, attachments, priorities, or custom columns.
- Never: accept a status from the client without checking it.

## Success Criteria

- A member can create, edit, and delete a task on a board they belong to.
- Each task has title, description, status, assignee, and due date (description, assignee, and due date may be empty).
- Dragging between columns, or choosing a column from the card's move control, persists status and order.
- The board shows three columns: To do, Doing, Done.
- Loading, empty, and error states are visible.
- Keyboard users can move a card without dragging.

## Open Questions

None. The first page of tasks is capped at 200, which is enough for a team board on one screen. The UI says so if a board is larger.
