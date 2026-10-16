import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";
import { timeline, totalFrames } from "./timeline";

export function Check({
  progress,
  size,
  color,
}: {
  progress: number;
  size: number;
  color: string;
}) {
  const length = 72;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path
        d="M14 34 L27 47 L50 18"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - progress)}
      />
    </svg>
  );
}

export function Paper() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          width: 1500,
          height: 1500,
          right: -460,
          top: -560,
          background: `radial-gradient(circle, ${theme.glow}, rgba(243, 236, 223, 0) 68%)`,
        }}
      />
      <svg
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0, opacity: 0.16, mixBlendMode: "multiply" }}
      >
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </>
  );
}

export function CornerMark() {
  const frame = useCurrentFrame();
  const logoFrames = timeline.beats[0].frames;
  const endFrames = timeline.beats[timeline.beats.length - 1].frames;
  const endStart = totalFrames(timeline) - endFrames;
  const fadeIn = interpolate(frame, [logoFrames - 10, logoFrames + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [endStart - 8, endStart + 6], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 64,
        top: 44,
        display: "flex",
        alignItems: "center",
        gap: 10,
        opacity: fadeIn * fadeOut,
      }}
    >
      <Check progress={1} size={28} color={theme.stamp} />
      <span
        style={{
          fontFamily: "Fraunces, Georgia, serif",
          fontSize: 28,
          fontWeight: 500,
          color: theme.ink,
          letterSpacing: "-0.03em",
        }}
      >
        Tidy
      </span>
    </div>
  );
}

export function Progress() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const width = interpolate(frame, [0, Math.max(durationInFrames - 1, 1)], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        bottom: 0,
        height: 5,
        width: `${width}%`,
        background: theme.stamp,
      }}
    />
  );
}
