import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';
import { openDatabase } from './db';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dataDir = path.join(root, 'data');
mkdirSync(dataDir, { recursive: true });

const db = openDatabase(path.join(dataDir, 'boardline.sqlite'));
const app = createApp(db);

app.listen(43118, '127.0.0.1', () => {
  console.log('API listening on http://127.0.0.1:43118');
});
