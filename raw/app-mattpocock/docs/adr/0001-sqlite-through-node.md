# SQLite through Node's built-in driver

Quay has to run after one `npm install` on a laptop, with no native build tools. The board is stored in SQLite through `node:sqlite`, which ships with Node 22, instead of a compiled driver such as better-sqlite3. The trade-off is a dependency on a still-experimental Node API and a minimum of Node 22.
