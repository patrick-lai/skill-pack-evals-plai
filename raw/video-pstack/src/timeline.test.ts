import assert from "node:assert/strict";
import test from "node:test";
import { durationSeconds, timeline, totalFrames } from "./timeline.ts";

test("the intro is 1080p and between 12 and 15 seconds", () => {
  const seconds = durationSeconds(timeline);
  assert.equal(timeline.width, 1920);
  assert.equal(timeline.height, 1080);
  assert.equal(timeline.fps, 30);
  assert.ok(seconds >= 12 && seconds <= 15, `duration ${seconds}s`);
  assert.equal(totalFrames(timeline), seconds * timeline.fps);
});

test("the film is a logo, three features, and an end card", () => {
  assert.deepEqual(
    timeline.beats.map((beat) => beat.kind),
    ["logo", "feature", "feature", "feature", "endcard"],
  );
  assert.deepEqual(
    timeline.beats.map((beat) => beat.id),
    ["logo", "capture", "today", "done", "end"],
  );
});

test("every beat has a positive length", () => {
  for (const beat of timeline.beats) {
    assert.ok(beat.frames > 0, beat.id);
  }
});
