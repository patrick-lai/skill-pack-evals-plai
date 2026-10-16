import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { closeApp, createApp } from './app.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(repoRoot, '.env') });

const port = Number(process.env.PORT || 43124);
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(repoRoot, process.env.DATABASE_PATH)
  : path.join(repoRoot, 'data', 'quay.sqlite');

if (!process.env.JWT_SECRET) {
  console.warn(
    'JWT_SECRET is not set. Using a development secret. Set JWT_SECRET before sharing this server.',
  );
}

const app = createApp(dbPath);
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Quay API listening on http://127.0.0.1:${port}`);
  console.log(`SQLite database at ${dbPath}`);
});

let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  server.close(() => {
    closeApp(app);
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
