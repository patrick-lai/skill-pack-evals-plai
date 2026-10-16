# Capability Map: Bench

A local team task board. Three independently testable modules.

| Module id | Responsibility | Depends on |
|---|---|---|
| identity | Email/password accounts and server sessions | — |
| boards | Multiple boards and membership | identity |
| tasks | Tasks, status columns, assignee, due date, drag order | boards, identity |

Build order: identity → boards → tasks

Assumptions recorded in `SPEC-identity.md`, `SPEC-boards.md`, and `SPEC-tasks.md`. The task prompt fixed the stack and the feature list. This session cannot pause for a separate approval turn, so those assumptions are the decisions the build proceeds with.
