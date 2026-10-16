import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Mark } from "../components/Mark";
import type { LogoRevealScene } from "../introFilm";
import { color, font } from "../theme";

export function LogoReveal({ scene }: { scene: LogoRevealScene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const markIn = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 90, mass: 0.8 },
  });
  const wordIn = spring({
    frame: frame - 12,
    fps,
    config: { damping: 16, stiffness: 100 },
  });
  const check = interpolate(frame, [10, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tagline = interpolate(frame, [28, 42], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            opacity: markIn,
            transform: `scale(${0.86 + markIn * 0.14})`,
            filter: "drop-shadow(0 18px 28px rgba(28, 24, 20, 0.16))",
          }}
        >
          <Mark size={148} progress={check} />
        </div>
        <div
          style={{
            marginTop: 32,
            fontFamily: font.serif,
            fontSize: 148,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            color: color.ink,
            opacity: wordIn,
            transform: `translateY(${(1 - wordIn) * 18}px)`,
          }}
        >
          {scene.wordmark}
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: font.serif,
            fontStyle: "italic",
            fontSize: 32,
            color: color.muted,
            opacity: tagline,
          }}
        >
          {scene.tagline}
        </div>
      </div>
    </AbsoluteFill>
  );
}
