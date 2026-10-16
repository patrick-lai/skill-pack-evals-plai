# Implementation Plan: Task comments

## Overview

Add a `comments` table and three task-scoped routes. Include `commentCount` on each task. Show that count on the card, and show the thread, with add and delete, in the task dialog.

## Architecture Decisions

- Comments hang off `tasks` with `ON DELETE CASCADE`, so deleting a task removes its thread.
- `author_id` references `users`. A comment stays if the author later leaves the board. The name still comes from the user row.
- Membership is checked with the existing `getTaskForUser` helper, which returns 404 for non-members. That matches tasks and does not reveal private boards.
- Delete is author-only. A board owner does not get a bypass.
- The count is a subquery on the existing task select, not a second client round trip.
- The thread UI is a presentational `TaskComments` component. `TaskDialog` loads and mutates it. `BoardPage` patches `commentCount` on the open task so the card updates while the dialog stays open.
- No new dependencies.

## Dependency order

```
comments table
    → comment data functions and commentCount on Task
        → routes and API tests
            → client types
                → card count and TaskComments UI tests
                    → dialog wiring and README
```

## Task List

### Phase 1: Persist and serve comments

- [x] Task 1: API tests for add, list, delete, and authorization
- [x] Task 2: Schema, data functions, routes to make those tests pass

### Checkpoint: API

- [x] Server tests pass
- [x] Existing board and task tests still pass

### Phase 2: Show comments

- [x] Task 3: Card count and comment thread UI tests
- [x] Task 4: Render the count, the thread, and keep the card count in sync

### Checkpoint: Complete

- [x] `npm test` passes
- [x] `npm run typecheck` passes
- [x] README describes comments

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Extra `commentCount` field breaks a strict task assertion | Medium | Existing tests use `toMatchObject`. Add the field as a number and re-run the suite. |
| Dialog reload closes or races with drag-and-drop | Medium | Update only that task's `commentCount` in board state. Do not reload the board. |
| Non-member can probe comment ids | High | Resolve the task through membership first. Missing access is 404. |

## Open Questions

None. See `SPEC.md` assumptions.
