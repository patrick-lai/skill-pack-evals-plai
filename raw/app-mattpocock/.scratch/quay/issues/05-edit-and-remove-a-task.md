# 05: Edit and remove a task

**What to build:** A member can change a task's title and status from the task itself, clear the assignee and due date, and delete the task. Deleting a missing task is a not-found. Editing sends only the fields that change.

**Blocked by:** 03: Add a task

**Status:** ready-for-agent

- [x] A title edit leaves the description in place
- [x] Assignee and due date can be cleared
- [x] Deleting a task removes it from the board
- [x] On the page, editing the title and status moves the card, and deleting removes it

## Comments

Implemented in this session. The acceptance criteria above are covered by the HTTP tests and the rendered board tests.
