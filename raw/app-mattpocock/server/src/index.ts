import { resolve } from 'node:path';
import { createApp } from './app';

const port = 43124;
const host = '127.0.0.1';
const filename = resolve(process.cwd(), 'data', 'quay.sqlite');

const app = createApp({ filename });
const url = await app.listen(port, host);
console.log(`Quay API listening on ${url}`);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void app.close().finally(() => process.exit(0));
  });
}
