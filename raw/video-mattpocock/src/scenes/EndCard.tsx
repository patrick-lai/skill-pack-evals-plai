import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Mark } from "../components/Mark";
import type { EndCardScene } from "../introFilm";
import { color, font } from "../theme";

export function EndCard({ scene }: { scene: EndCardScene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const markIn = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 110 },
  });
  const wordIn = spring({
    frame: frame - 6,
    fps,
    config: { damping: 16, stiffness: 110 },
  });
  const lineIn = interpolate(frame, [14, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const urlIn = interpolate(frame, [22, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            opacity: markIn,
            transform: `scale(${0.92 + markIn * 0.08})`,
            filter: "drop-shadow(0 14px 24px rgba(28, 24, 20, 0.14))",
          }}
        >
          <Mark size={96} />
        </div>
        <div
          style={{
            marginTop: 22,
            fontFamily: font.serif,
            fontSize: 120,
            lineHeight: 0.9,
            letterSpacing: "-0.04em",
            color: color.ink,
            opacity: wordIn,
            transform: `translateY(${(1 - wordIn) * 14}px)`,
          }}
        >
          {scene.wordmark}
        </div>
        <div
          style={{
            marginTop: 16,
            fontFamily: font.serif,
            fontStyle: "italic",
            fontSize: 36,
            color: color.muted,
            opacity: lineIn,
          }}
        >
          {scene.tagline}
        </div>
        <div
          style={{
            marginTop: 28,
            padding: "10px 18px",
            borderRadius: 999,
            border: `1px solid rgba(28, 24, 20, 0.18)`,
            fontFamily: font.sans,
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: color.ink,
            opacity: urlIn,
          }}
        >
          {scene.url}
        </div>
      </div>
    </AbsoluteFill>
  );
}
