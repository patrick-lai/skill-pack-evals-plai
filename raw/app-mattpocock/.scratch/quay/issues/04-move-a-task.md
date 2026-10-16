# 04: Move a task between columns

**What to build:** Dragging a task onto another column changes its status. A status outside To do, Doing, and Done is refused. Fields that were not part of the move stay as they were.

**Blocked by:** 03: Add a task

**Status:** ready-for-agent

- [x] Moving a task to Done keeps its description and due date
- [x] An unknown status is refused
- [x] On the page, dragging a task from To do drops it in Done

## Comments

Implemented in this session. The acceptance criteria above are covered by the HTTP tests and the rendered board tests.
