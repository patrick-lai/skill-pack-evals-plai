# Spec: boards

## Objective

A signed-in person can keep more than one board, open one, and share it with teammates who already have accounts. A board is the place tasks live. People who are not members cannot see it.

## Commands

Same as `SPEC-identity.md`. Board routes are part of `@bench/server`.

## Project Structure

```
server/src/routes/boards.ts   Board CRUD and members
client/src/components/BoardIndex.tsx
```

## Code Style

REST nouns, plural, camelCase JSON. A missing board and a board the caller is not a member of both return 404, so ids are not an existence oracle.

## Testing Strategy

API tests create two users. The second user must not read, update, or delete the first user's board. The owner can invite the second user by email; that user can then open the board. Only the owner can rename, delete, or remove a member.

## Boundaries

- Always: check membership on every board read and write.
- Ask first: public links, board roles beyond owner and member.
- Never: leak boards across users.

## Success Criteria

- Create, list, open, rename, and delete boards.
- List shows only boards the caller belongs to, with role and member count.
- Owner can add a member by email and remove a member.
- Inviting an unknown email returns 404.
- Removing a member clears that person's task assignments on the board.
- A member cannot delete the board, rename it, or remove people. The owner cannot be removed.

## Open Questions

None. "Team" means members of a board, not a separate team entity.
