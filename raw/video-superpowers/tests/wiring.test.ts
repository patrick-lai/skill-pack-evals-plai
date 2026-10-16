import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

test("feature scenes read copy from the timeline", () => {
  assert.match(source("src/tidy/FeatureCapture.tsx"), /featureById\("capture"\)/);
  assert.match(source("src/tidy/FeaturePlace.tsx"), /featureById\("place"\)/);
  assert.match(source("src/tidy/FeatureClose.tsx"), /featureById\("close"\)/);
});

test("the composition uses the timeline dimensions", () => {
  const root = source("src/Root.tsx");
  assert.match(root, /COMPOSITION\.width/);
  assert.match(root, /COMPOSITION\.height/);
  assert.match(root, /COMPOSITION\.fps/);
  assert.match(root, /COMPOSITION\.durationInFrames/);
});
