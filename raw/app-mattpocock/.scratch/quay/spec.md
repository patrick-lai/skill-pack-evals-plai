Status: ready-for-agent

# Quay

## Problem Statement

A team needs one place to see what work is to do, in progress, and done. They need to sign in, keep more than one board, and move tasks between those three statuses without a hosted service.

## Solution

Quay is a local team task board. A person joins with email and password, opens boards, and tracks tasks that have a title, description, status (To do, Doing, or Done), an optional assignee, and an optional due date. Dragging a task onto another column changes its status. Everyone who can sign in on this installation shares the same boards.

## User Stories

1. As a person, I want to join with my email and a password, so that the team can tell my work apart from everyone else's.
2. As a person, I want my email stored without regard to capital letters, so that I can sign in the way I usually type it.
3. As a person, I want a password shorter than 8 characters to be rejected, so that a trivial password is not accepted.
4. As a person, I want an obviously invalid email to be rejected, so that the team is not full of unusable addresses.
5. As a person, I want a duplicate email to be rejected, so that two members cannot share one address.
6. As a member, I want to sign in with my email and password, so that I can reach the boards.
7. As a person, I want an unknown email and a wrong password to fail with the same message, so that the form does not reveal who has already joined.
8. As a member, I want to stay signed in across reloads, so that I do not sign in on every visit.
9. As a member, I want to sign out, so that the next person at this browser is not signed in as me.
10. As a signed-out person, I want boards and tasks to be refused, so that the board is not public.
11. As a member, I want to open a board by naming it, so that a stream of work has a home.
12. As a member, I want a blank board name to be rejected, so that a board is never nameless.
13. As a member, I want to see every board on the team, so that I can move between them.
14. As a member, I want another member's board to appear in my list, so that the team is actually sharing one Quay.
15. As a member, I want to rename a board, so that the name can keep up with the work.
16. As a member, I want to delete a board and its tasks, so that finished efforts can leave the wall.
17. As a member, I want an open board to show three columns, To do, Doing, and Done, so that status is visible at a glance.
18. As a member, I want an empty column to say that nothing is there, so that an empty board does not look broken.
19. As a member, I want to add a task with a title, so that the work exists on the board.
20. As a member, I want a blank task title to be rejected, so that a task can be told apart from the others.
21. As a member, I want to record a description on a task, so that the next person knows what "done" means.
22. As a member, I want a new task to land in To do unless I choose another status, so that fresh work starts in the right place.
23. As a member, I want to assign a task to any member, so that someone is responsible.
24. As a member, I want an assignee who is not a member to be rejected, so that a task cannot point at nobody.
25. As a member, I want to leave a task unassigned, so that work can sit on the board before it has an owner.
26. As a member, I want to set a due date as a calendar day, so that the board shows when the work is meant to be finished.
27. As a member, I want an impossible calendar day to be rejected, so that the due date is a real day.
28. As a member, I want to leave the due date empty, so that undated work is allowed.
29. As a member, I want tasks in a column to keep a stable order, so that the board does not reshuffle itself.
30. As a member, I want to drag a task onto another column, so that I can change its status without opening a form.
31. As a member, I want to change status, title, description, assignee, and due date from the task itself, so that drag is not the only way to update it.
32. As a member, I want clearing the assignee and the due date to stick, so that I can take those facts back off a task.
33. As a member, I want an edit to leave fields I did not send unchanged, so that renaming a task does not wipe its description.
34. As a member, I want a status outside To do, Doing, and Done to be rejected, so that the three columns stay the whole model.
35. As a member, I want to delete a task, so that work that should not be on the board can leave.
36. As a member, I want a past due date on a task that is not Done to read as overdue, so that late work is obvious.
37. As a member, I want a failed sign-in to show the reason on the page, so that I can correct it.
38. As a member, I want the board to be usable on a narrow screen, so that the columns are still reachable on a phone.

## Implementation Decisions

- One server module. Callers, including the browser and the tests, reach it only through HTTP. SQLite, password hashing, and sessions stay inside that module.
- One client. It talks to the server with same-origin `/api` requests. In local development the page proxies those requests to the API.
- Passwords are hashed with scrypt. The response for a member is only id and email.
- A session is an HttpOnly cookie, `quay_session`, lasting 14 days. The stored value is a hash of the token.
- The SQLite file is created on first start at `server/data/quay.sqlite` unless a test passes an in-memory database. See ADR 0001.
- One team per installation. See ADR 0002.
- Status values on the wire are `todo`, `doing`, and `done`. The columns are labelled To do, Doing, and Done.
- A task's JSON shape is id, title, description, status, assigneeId, dueDate, and position. Omitted fields on edit stay as they are. JSON null clears assigneeId and dueDate.
- Dropping a task on a column sends that status. The task moves to the end of the destination column.
- A board summary is id, name, and taskCount.
- `npm install` then `npm start` is the only setup. The page listens on port 43123 and the API on port 43124.

## Testing Decisions

Good tests exercise behavior through a public interface. They do not query SQLite, mock internal functions, or assert private call order.

Two seams, both named by the task:

- The HTTP interface of the board module. Tests start the app on an ephemeral port with an in-memory database and speak HTTP. This catches auth, sharing, validation, and task edits.
- The rendered board. Tests boot the same HTTP interface, render the page, and act as a member: join, sign in, open a board, add a task, drag it, edit it, delete it. This catches wiring the page would get wrong even when the HTTP interface is right.

There is no prior test suite. These seams are the whole suite.

## Out of Scope

Invitations, more than one team, private boards, roles, comments, attachments, notifications, live presence, reordering inside a column, search, filters, password reset by email, and any sign-in other than email and password.

## Further Notes

The way to run Quay locally is `npm install` and `npm start`. Tests are `npm test`.
