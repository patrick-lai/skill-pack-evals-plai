export const COMPOSITION_ID = "Tidy";

export const FPS = 30;

export const WIDTH = 1920;

export const HEIGHT = 1080;

export const SCENES = [
  { id: "logo", kind: "logo", from: 0, durationInFrames: 84 },
  { id: "capture", kind: "feature", from: 84, durationInFrames: 90 },
  { id: "today", kind: "feature", from: 174, durationInFrames: 90 },
  { id: "close", kind: "feature", from: 264, durationInFrames: 90 },
  { id: "end", kind: "end", from: 354, durationInFrames: 66 },
] as const;

export const DURATION_IN_FRAMES = SCENES.reduce(
  (total, scene) => total + scene.durationInFrames,
  0,
);

export type SceneId = (typeof SCENES)[number]["id"];

export function sceneById(id: SceneId) {
  const scene = SCENES.find((item) => item.id === id);
  if (!scene) {
    throw new Error(`Unknown scene ${id}`);
  }
  return scene;
}

export function sceneIndexAt(frame: number): number {
  const index = SCENES.findIndex(
    (scene) =>
      frame >= scene.from && frame < scene.from + scene.durationInFrames,
  );
  if (index >= 0) {
    return index;
  }
  return frame < 0 ? 0 : SCENES.length - 1;
}

export function localFrameFor(frame: number, id: SceneId): number {
  const scene = sceneById(id);
  const local = frame - scene.from;
  if (local < 0) {
    return 0;
  }
  return Math.min(local, scene.durationInFrames - 1);
}
