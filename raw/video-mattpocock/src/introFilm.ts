export type LogoRevealScene = {
  id: "logo";
  role: "logo-reveal";
  wordmark: string;
  tagline: string;
  from: number;
  durationInFrames: number;
};

export type FeatureBeatScene = {
  id: "capture" | "arrange" | "finish";
  role: "feature-beat";
  index: string;
  title: string;
  headline: string;
  support: string;
  from: number;
  durationInFrames: number;
};

export type EndCardScene = {
  id: "end-card";
  role: "end-card";
  wordmark: string;
  tagline: string;
  url: string;
  from: number;
  durationInFrames: number;
};

export type Scene = LogoRevealScene | FeatureBeatScene | EndCardScene;

export type IntroFilm = {
  id: "TidyIntro";
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  scenes: readonly Scene[];
};

const passages = [
  {
    id: "logo",
    role: "logo-reveal",
    wordmark: "Tidy",
    tagline: "The quiet task list.",
    durationInFrames: 90,
  },
  {
    id: "capture",
    role: "feature-beat",
    index: "01",
    title: "Capture",
    headline: "Out of your\nhead.",
    support: "One line, and it's kept.",
    durationInFrames: 84,
  },
  {
    id: "arrange",
    role: "feature-beat",
    index: "02",
    title: "Arrange",
    headline: "Today stays\nshort.",
    support: "The rest can wait.",
    durationInFrames: 84,
  },
  {
    id: "finish",
    role: "feature-beat",
    index: "03",
    title: "Finish",
    headline: "Done means\ndone.",
    support: "Check it off. The day gets quieter.",
    durationInFrames: 84,
  },
  {
    id: "end-card",
    role: "end-card",
    wordmark: "Tidy",
    tagline: "Less noise. Clear days.",
    url: "tidy.app",
    durationInFrames: 78,
  },
] as const;

export function introFilm(): IntroFilm {
  let from = 0;
  const scenes = passages.map((passage) => {
    const scene = { ...passage, from };
    from += passage.durationInFrames;
    return scene;
  });

  return {
    id: "TidyIntro",
    width: 1920,
    height: 1080,
    fps: 30,
    durationInFrames: from,
    scenes,
  };
}
