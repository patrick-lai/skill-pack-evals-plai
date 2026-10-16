import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const file = "renders/tidy-intro.mp4";

if (!existsSync(file)) {
  console.error(`missing ${file}`);
  process.exit(1);
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
  console.error(probe.stderr || "ffprobe failed");
  process.exit(1);
}

const data = JSON.parse(probe.stdout);
const streams = data.streams ?? [];
const video = streams.find((stream) => stream.codec_type === "video");
const audio = streams.find((stream) => stream.codec_type === "audio");
const duration = Number(data.format?.duration);

if (!video) {
  console.error("no video stream");
  process.exit(1);
}
if (audio) {
  console.error("unexpected audio stream");
  process.exit(1);
}
if (video.codec_name !== "h264") {
  console.error(`codec ${video.codec_name}, expected h264`);
  process.exit(1);
}
if (Number(video.width) !== 1920 || Number(video.height) !== 1080) {
  console.error(`size ${video.width}x${video.height}, expected 1920x1080`);
  process.exit(1);
}
if (!(duration >= 12 && duration <= 15.05)) {
  console.error(`duration ${duration}s, expected 12–15s`);
  process.exit(1);
}

console.log(
  `ok ${video.codec_name} ${video.width}x${video.height} ${duration.toFixed(3)}s`,
);
