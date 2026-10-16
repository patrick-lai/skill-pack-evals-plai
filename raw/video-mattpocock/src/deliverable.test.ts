import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { expect, test } from "vitest";

const mp4 = "renders/tidy-intro.mp4";

test("the delivered mp4 is 1080p h264 and between 12 and 15 seconds", () => {
  expect(existsSync(mp4)).toBe(true);

  const raw = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,codec_name:format=duration",
      "-of",
      "json",
      mp4,
    ],
    { encoding: "utf8" },
  );
  const parsed = JSON.parse(raw) as {
    streams: { width: number; height: number; codec_name: string }[];
    format: { duration: string };
  };
  const stream = parsed.streams[0];
  const seconds = Number(parsed.format.duration);

  expect(stream.codec_name).toBe("h264");
  expect(stream.width).toBe(1920);
  expect(stream.height).toBe(1080);
  expect(seconds).toBeGreaterThanOrEqual(12);
  expect(seconds).toBeLessThanOrEqual(15);
});
