import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { openDatabase } from "./db.ts";

const port = Number(process.env.PORT ?? 43124);
const host = process.env.HOST ?? "0.0.0.0";
const dbPath =
  process.env.DB_PATH ?? fileURLToPath(new URL("../../data/plank.sqlite", import.meta.url));

mkdirSync(dirname(dbPath), { recursive: true });
const db = openDatabase(dbPath);

serve({ fetch: createApp(db).fetch, port, hostname: host }, (info) => {
  console.log(`API listening on http://127.0.0.1:${info.port}`);
});
