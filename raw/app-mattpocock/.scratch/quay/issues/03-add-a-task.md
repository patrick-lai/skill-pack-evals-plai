# 03: Add a task

**What to build:** A member can add a task with a title, description, status, assignee, and due date, and see it in the matching column. A blank title, an unknown assignee, and an impossible due date are refused. Tasks keep their order. Another member sees the task.

**Blocked by:** 02: Open a board

**Status:** ready-for-agent

- [x] A task with all of its fields is stored and listed in order
- [x] A blank title, a fake assignee, and a bad due date are refused
- [x] The page shows the title, description, assignee, and an overdue due date on the card

## Comments

Implemented in this session. The acceptance criteria above are covered by the HTTP tests and the rendered board tests.
