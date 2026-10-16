export const COMPOSITION = {
  id: "TidyIntro",
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 420,
} as const;

export type BeatId = "logo" | "capture" | "place" | "close" | "end";

export type Beat = {
  id: BeatId;
  start: number;
  end: number;
};

export const BEATS: readonly Beat[] = [
  { id: "logo", start: 0, end: 90 },
  { id: "capture", start: 90, end: 174 },
  { id: "place", start: 174, end: 258 },
  { id: "close", start: 258, end: 336 },
  { id: "end", start: 336, end: 420 },
];

export type FeatureId = "capture" | "place" | "close";

export type Feature = {
  id: FeatureId;
  index: string;
  name: string;
  title: string;
  body: string;
};

export const FEATURES: readonly Feature[] = [
  {
    id: "capture",
    index: "01",
    name: "Capture",
    title: "Catch it in one line.",
    body: "No project. No due date. Just the thought.",
  },
  {
    id: "place",
    index: "02",
    name: "Place",
    title: "Put it where the day can hold it.",
    body: "Morning, afternoon, or evening. Not a pile.",
  },
  {
    id: "close",
    index: "03",
    name: "Close",
    title: "Close the day on purpose.",
    body: "Done, or moved to tomorrow. Nothing left hovering.",
  },
];

export const LOGO = {
  wordmark: "Tidy",
  line: "A calmer list.",
} as const;

export const END_CARD = {
  wordmark: "Tidy",
  line: "The calm task list.",
  url: "tidy.app",
} as const;

export const CAPTURE = {
  text: "Call the dentist",
  label: "Inbox",
  chip: "Kept",
  typeStart: 18,
  framesPerChar: 2,
} as const;

export const PLACE = {
  lanes: ["Morning", "Afternoon", "Evening"] as const,
  target: "Afternoon" as const,
  text: "Call the dentist",
  moveStart: 16,
  moveDuration: 22,
} as const;

export const CLOSE_ROWS = [
  { text: "Call the dentist", kind: "check" as const },
  { text: "Reply to Mara", kind: "tomorrow" as const },
  { text: "Water the fern", kind: "resting" as const },
] as const;

export const CLOSE_TOMORROW = "Tomorrow";

export function beatById(id: BeatId): Beat {
  const beat = BEATS.find((item) => item.id === id);
  if (!beat) throw new Error(`unknown beat ${id}`);
  return beat;
}

export function featureById(id: FeatureId): Feature {
  const feature = FEATURES.find((item) => item.id === id);
  if (!feature) throw new Error(`unknown feature ${id}`);
  return feature;
}

export function sceneAtFrame(frame: number): BeatId {
  if (frame < 0 || frame >= COMPOSITION.durationInFrames) {
    throw new Error(`frame ${frame} outside timeline`);
  }
  const beat = BEATS.find((item) => frame >= item.start && frame < item.end);
  if (!beat) throw new Error(`frame ${frame} outside timeline`);
  return beat.id;
}
