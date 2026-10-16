import assert from "node:assert/strict";
import { test } from "vitest";
import { COLORS } from "../src/tidy/brand";
import {
  BEATS,
  CAPTURE,
  CLOSE_ROWS,
  COMPOSITION,
  PLACE,
  featureById,
  sceneAtFrame,
} from "../src/tidy/timeline";

test("composition is 1080p, 30fps, and exactly 14 seconds", () => {
  assert.equal(COMPOSITION.id, "TidyIntro");
  assert.equal(COMPOSITION.width, 1920);
  assert.equal(COMPOSITION.height, 1080);
  assert.equal(COMPOSITION.fps, 30);
  assert.equal(COMPOSITION.durationInFrames, 420);
  const seconds = COMPOSITION.durationInFrames / COMPOSITION.fps;
  assert.ok(seconds >= 12 && seconds <= 15);
});

test("beats cover every frame once, in story order", () => {
  assert.deepEqual(
    BEATS.map((beat) => beat.id),
    ["logo", "capture", "place", "close", "end"],
  );
  assert.equal(BEATS[0].start, 0);
  assert.equal(BEATS[BEATS.length - 1].end, COMPOSITION.durationInFrames);
  for (let i = 0; i < BEATS.length; i++) {
    assert.ok(BEATS[i].end > BEATS[i].start);
    if (i > 0) assert.equal(BEATS[i].start, BEATS[i - 1].end);
  }
  for (let frame = 0; frame < COMPOSITION.durationInFrames; frame++) {
    const owners = BEATS.filter((beat) => frame >= beat.start && frame < beat.end);
    assert.equal(owners.length, 1, `frame ${frame}`);
    assert.equal(sceneAtFrame(frame), owners[0].id);
  }
});

test("sceneAtFrame rejects frames outside the film", () => {
  assert.equal(sceneAtFrame(0), "logo");
  assert.equal(sceneAtFrame(89), "logo");
  assert.equal(sceneAtFrame(90), "capture");
  assert.equal(sceneAtFrame(419), "end");
  assert.throws(() => sceneAtFrame(420), /outside/);
  assert.throws(() => sceneAtFrame(-1), /outside/);
});

test("feature copy matches the spec", () => {
  assert.deepEqual(featureById("capture"), {
    id: "capture",
    index: "01",
    name: "Capture",
    title: "Catch it in one line.",
    body: "No project. No due date. Just the thought.",
  });
  assert.deepEqual(featureById("place"), {
    id: "place",
    index: "02",
    name: "Place",
    title: "Put it where the day can hold it.",
    body: "Morning, afternoon, or evening. Not a pile.",
  });
  assert.deepEqual(featureById("close"), {
    id: "close",
    index: "03",
    name: "Close",
    title: "Close the day on purpose.",
    body: "Done, or moved to tomorrow. Nothing left hovering.",
  });
});

test("the dentist task is the same string in every beat", () => {
  assert.equal(CAPTURE.text, "Call the dentist");
  assert.equal(PLACE.text, "Call the dentist");
  assert.equal(CLOSE_ROWS[0].text, "Call the dentist");
  assert.equal(CAPTURE.text, PLACE.text);
  assert.equal(PLACE.text, CLOSE_ROWS[0].text);
  assert.deepEqual(PLACE.lanes, ["Morning", "Afternoon", "Evening"]);
  assert.equal(PLACE.target, "Afternoon");
  assert.equal(CAPTURE.chip, "Kept");
  assert.equal(CAPTURE.label, "Inbox");
  assert.equal(CLOSE_ROWS[1].text, "Reply to Mara");
  assert.equal(CLOSE_ROWS[1].kind, "tomorrow");
  assert.equal(CLOSE_ROWS[2].text, "Water the fern");
  assert.equal(CLOSE_ROWS[2].kind, "resting");
  assert.equal(CLOSE_ROWS[0].kind, "check");
});

test("brand colors are the paper, ink, celadon, and clay of the spec", () => {
  assert.equal(COLORS.paper, "#EFE7DA");
  assert.equal(COLORS.ink, "#1C1712");
  assert.equal(COLORS.celadon, "#1E6B52");
  assert.equal(COLORS.clay, "#A65B3C");
});
