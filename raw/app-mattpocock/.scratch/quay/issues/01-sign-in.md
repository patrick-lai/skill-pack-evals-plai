# 01: Sign in to an empty team

**What to build:** A person can join, sign in, stay signed in, and sign out. A signed-out person cannot see the boards. The page shows the sign-in form, the error for a wrong password, and an empty team after someone new joins.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] A person can join and then reads back as the signed-in member
- [x] A short password, a bad email, a duplicate email, and a wrong password are refused
- [x] Unknown email and wrong password share one error message
- [x] Sign-out ends the session
- [x] Signed-out requests for boards are refused
- [x] The page can join, reject a wrong password, sign in, and sign out

## Comments

Implemented in this session. The acceptance criteria above are covered by the HTTP tests and the rendered board tests.
