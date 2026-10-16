import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COMPOSITION_ID,
  DURATION_IN_FRAMES,
  FPS,
  HEIGHT,
  localFrameFor,
  sceneIndexAt,
  SCENES,
  WIDTH,
} from "../src/edit.ts";

test("the film is 1080p and exactly 14 seconds", () => {
  assert.equal(WIDTH, 1920);
  assert.equal(HEIGHT, 1080);
  assert.equal(FPS, 30);
  assert.equal(COMPOSITION_ID, "Tidy");
  assert.equal(DURATION_IN_FRAMES / FPS, 14);
  assert.ok(DURATION_IN_FRAMES / FPS >= 12);
  assert.ok(DURATION_IN_FRAMES / FPS <= 15);
});

test("scenes run logo, three features, then the end card", () => {
  assert.deepEqual(
    SCENES.map((scene) => scene.id),
    ["logo", "capture", "today", "close", "end"],
  );
  assert.equal(SCENES.filter((scene) => scene.kind === "feature").length, 3);
  assert.equal(SCENES[0]?.kind, "logo");
  assert.equal(SCENES.at(-1)?.kind, "end");
});

test("scenes tile the timeline without gaps or overlap", () => {
  assert.equal(SCENES[0]?.from, 0);
  let cursor = 0;
  for (const scene of SCENES) {
    assert.equal(scene.from, cursor);
    assert.ok(scene.durationInFrames > 0);
    cursor += scene.durationInFrames;
  }
  assert.equal(cursor, DURATION_IN_FRAMES);
});

test("frame lookup stays inside the scene that owns that frame", () => {
  assert.equal(SCENES[sceneIndexAt(0)]?.id, "logo");
  assert.equal(SCENES[sceneIndexAt(SCENES[1].from - 1)]?.id, "logo");
  assert.equal(SCENES[sceneIndexAt(SCENES[1].from)]?.id, "capture");
  assert.equal(SCENES[sceneIndexAt(DURATION_IN_FRAMES - 1)]?.id, "end");
  assert.equal(localFrameFor(SCENES[2].from + 10, "today"), 10);
  assert.equal(localFrameFor(0, "today"), 0);
  assert.equal(
    localFrameFor(DURATION_IN_FRAMES + 20, "end"),
    SCENES.at(-1)!.durationInFrames - 1,
  );
});
