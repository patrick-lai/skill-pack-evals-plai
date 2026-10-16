import { CAPTURE } from "./timeline";

export function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function entrance(
  localFrame: number,
  duration = 8,
): { opacity: number; offsetY: number } {
  const t = easeOut(clamp01(localFrame / duration));
  return { opacity: 0.35 + 0.65 * t, offsetY: (1 - t) * 16 };
}

export function typedText(
  full: string,
  localFrame: number,
  startFrame: number,
  framesPerChar: number,
): string {
  if (localFrame < startFrame) return "";
  const count = Math.floor((localFrame - startFrame) / framesPerChar) + 1;
  return full.slice(0, Math.min(full.length, count));
}

export function captureChipVisible(localFrame: number): boolean {
  const doneAt =
    CAPTURE.typeStart + (CAPTURE.text.length - 1) * CAPTURE.framesPerChar;
  return localFrame >= doneAt + 8;
}

export function placeProgress(
  localFrame: number,
  moveStart: number,
  moveDuration: number,
): number {
  const t = clamp01((localFrame - moveStart) / moveDuration);
  return easeOut(t);
}

export function closeRowState(
  localFrame: number,
  kind: "check" | "tomorrow" | "resting",
): { checked: number; moved: number } {
  if (kind === "resting") return { checked: 1, moved: 0 };
  if (kind === "check") {
    return { checked: clamp01((localFrame - 14) / 16), moved: 0 };
  }
  return { checked: 0, moved: clamp01((localFrame - 32) / 16) };
}

export function logoWordmarkOpacity(localFrame: number): number {
  return easeOut(clamp01((localFrame - 22) / 14));
}

export function endLineOpacity(localFrame: number, delay: number): number {
  if (delay <= 0) return 1;
  return easeOut(clamp01((localFrame - delay) / 12));
}
