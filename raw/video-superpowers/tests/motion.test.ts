import assert from "node:assert/strict";
import { test } from "vitest";
import {
  captureChipVisible,
  closeRowState,
  endLineOpacity,
  entrance,
  logoWordmarkOpacity,
  placeProgress,
  typedText,
} from "../src/tidy/motion";

test("typedText reveals one character at a time and then holds", () => {
  assert.equal(typedText("Call the dentist", 17, 18, 2), "");
  assert.equal(typedText("Call the dentist", 18, 18, 2), "C");
  assert.equal(typedText("Call the dentist", 20, 18, 2), "Ca");
  assert.equal(typedText("Call the dentist", 48, 18, 2), "Call the dentist");
  assert.equal(typedText("Call the dentist", 80, 18, 2), "Call the dentist");
});

test("the Kept chip appears eight frames after the line finishes", () => {
  assert.equal(captureChipVisible(55), false);
  assert.equal(captureChipVisible(56), true);
});

test("placeProgress eases from 0 before the move to 1 after it", () => {
  assert.equal(placeProgress(15, 16, 22), 0);
  assert.equal(placeProgress(16, 16, 22), 0);
  assert.equal(placeProgress(38, 16, 22), 1);
  const mid = placeProgress(27, 16, 22);
  assert.ok(mid > 0.5 && mid < 1);
});

test("close rows check, move, or rest on the specified frames", () => {
  assert.deepEqual(closeRowState(0, "resting"), { checked: 1, moved: 0 });
  assert.deepEqual(closeRowState(13, "check"), { checked: 0, moved: 0 });
  assert.deepEqual(closeRowState(30, "check"), { checked: 1, moved: 0 });
  assert.deepEqual(closeRowState(31, "tomorrow"), { checked: 0, moved: 0 });
  assert.deepEqual(closeRowState(48, "tomorrow"), { checked: 0, moved: 1 });
});

test("entrances and title fades match the cut timing", () => {
  assert.equal(entrance(0).opacity, 0.35);
  assert.equal(logoWordmarkOpacity(22), 0);
  assert.equal(logoWordmarkOpacity(36), 1);
  assert.equal(endLineOpacity(0, 0), 1);
  assert.equal(endLineOpacity(16, 16), 0);
  assert.equal(endLineOpacity(28, 16), 1);
});
