export type When = "today" | "later";

export type TaskLine = {
  id: string;
  label: string;
  when: When;
};

export type LogoBeat = {
  kind: "logo";
  id: "logo";
  frames: number;
};

export type CaptureBeat = {
  kind: "feature";
  id: "capture";
  frames: number;
  kicker: string;
  title: string;
  task: string;
};

export type TodayBeat = {
  kind: "feature";
  id: "today";
  frames: number;
  kicker: string;
  title: string;
  rows: readonly TaskLine[];
};

export type DoneBeat = {
  kind: "feature";
  id: "done";
  frames: number;
  kicker: string;
  title: string;
  task: string;
  empty: string;
};

export type EndBeat = {
  kind: "endcard";
  id: "end";
  frames: number;
  line: string;
};

export type Beat = LogoBeat | CaptureBeat | TodayBeat | DoneBeat | EndBeat;

export type Timeline = {
  fps: number;
  width: number;
  height: number;
  beats: readonly Beat[];
};

export const timeline = {
  fps: 30,
  width: 1920,
  height: 1080,
  beats: [
    { kind: "logo", id: "logo", frames: 90 },
    {
      kind: "feature",
      id: "capture",
      frames: 96,
      kicker: "01",
      title: "Write it once.",
      task: "Book the 4pm train",
    },
    {
      kind: "feature",
      id: "today",
      frames: 96,
      kicker: "02",
      title: "Only what is due.",
      rows: [
        { id: "train", label: "Book the 4pm train", when: "today" },
        { id: "closet", label: "Reorganize the closet", when: "later" },
        { id: "knives", label: "Learn to sharpen knives", when: "later" },
      ],
    },
    {
      kind: "feature",
      id: "done",
      frames: 84,
      kicker: "03",
      title: "It leaves.",
      task: "Book the 4pm train",
      empty: "Nothing waiting.",
    },
    {
      kind: "endcard",
      id: "end",
      frames: 72,
      line: "The short list.",
    },
  ],
} as const satisfies Timeline;

export function totalFrames(film: Timeline): number {
  return film.beats.reduce((sum, beat) => sum + beat.frames, 0);
}

export function durationSeconds(film: Timeline): number {
  return totalFrames(film) / film.fps;
}
