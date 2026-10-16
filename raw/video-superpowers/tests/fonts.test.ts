import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "vitest";

const FONTS = [
  "public/fonts/fraunces-latin-full-normal.woff2",
  "public/fonts/fraunces-latin-full-italic.woff2",
  "public/fonts/outfit-latin-wght-normal.woff2",
];

test("brand fonts are vendored in the repo", () => {
  for (const file of FONTS) {
    assert.equal(existsSync(file), true, file);
  }
});
