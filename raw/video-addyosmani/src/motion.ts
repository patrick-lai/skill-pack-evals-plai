import { Easing, interpolate, spring } from "remotion";

// https://www.remotion.dev/docs/animating-properties
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

export function unit(frame: number, start: number, end: number): number {
  return interpolate(frame, [start, end], [0, 1], {
    ...clamp,
    easing: easeOut,
  });
}

export function slideCamera(frameInScene: number, index: number): number {
  if (index === 0) {
    return 0;
  }
  return interpolate(frameInScene, [0, 18], [index - 1, index], {
    ...clamp,
    easing: Easing.bezier(0.76, 0, 0.24, 1),
  });
}

export function settle(
  frame: number,
  fps: number,
  delay = 0,
): number {
  return spring({
    frame: frame - delay,
    fps,
    durationInFrames: 20,
    config: {
      damping: 18,
      stiffness: 140,
      mass: 0.7,
      overshootClamping: true,
    },
  });
}
