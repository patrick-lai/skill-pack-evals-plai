import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";

const file = process.argv[2] ?? "renders/tidy-intro.mp4";
const info = statSync(file);
if (info.size < 100_000) {
  throw new Error(`${file} is ${info.size} bytes`);
}

const probe = spawnSync(
  "ffprobe",
  [
    "-v",
    "error",
    "-show_entries",
    "format=duration:stream=codec_type,codec_name,width,height",
    "-of",
    "json",
    file,
  ],
  { encoding: "utf8" },
);

if (probe.status !== 0) {
  throw new Error(probe.stderr || "ffprobe failed");
}

const parsed = JSON.parse(probe.stdout);
const video = (parsed.streams ?? []).find((stream) => stream.codec_type === "video");
if (!video) {
  throw new Error("no video stream");
}

const duration = Number(parsed.format?.duration);
const width = Number(video.width);
const height = Number(video.height);
const failures = [];
if (width !== 1920 || height !== 1080) {
  failures.push(`size ${width}x${height}`);
}
if (!(duration >= 12 && duration <= 15)) {
  failures.push(`duration ${duration}`);
}
if (video.codec_name !== "h264") {
  failures.push(`codec ${video.codec_name}`);
}
if (failures.length > 0) {
  throw new Error(failures.join(", "));
}

console.log(
  JSON.stringify({
    file,
    bytes: info.size,
    width,
    height,
    duration,
    codec: video.codec_name,
  }),
);
