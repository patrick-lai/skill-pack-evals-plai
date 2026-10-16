import { describe, expect, test } from "vitest";
import { introFilm } from "./introFilm";

describe("intro", () => {
  test("is a 1080p picture", () => {
    const film = introFilm();

    expect(film.width).toBe(1920);
    expect(film.height).toBe(1080);
  });

  test("lasts between 12 and 15 seconds", () => {
    const film = introFilm();
    const seconds = film.durationInFrames / film.fps;

    expect(seconds).toBeGreaterThanOrEqual(12);
    expect(seconds).toBeLessThanOrEqual(15);
  });

  test("opens with a logo reveal, plays three feature beats, and closes on an end card", () => {
    const film = introFilm();

    expect(film.scenes.map((scene) => scene.role)).toEqual([
      "logo-reveal",
      "feature-beat",
      "feature-beat",
      "feature-beat",
      "end-card",
    ]);

    const titles = film.scenes
      .filter((scene) => scene.role === "feature-beat")
      .map((scene) => scene.title);

    expect(titles).toEqual(["Capture", "Arrange", "Finish"]);
  });

  test("plays its scenes back to back from the first frame to the last", () => {
    const film = introFilm();
    let cursor = 0;

    for (const scene of film.scenes) {
      expect(scene.from).toBe(cursor);
      expect(scene.durationInFrames).toBeGreaterThan(0);
      cursor += scene.durationInFrames;
    }

    expect(cursor).toBe(film.durationInFrames);
  });
});
