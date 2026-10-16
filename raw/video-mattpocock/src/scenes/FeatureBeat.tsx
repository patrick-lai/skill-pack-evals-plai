import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AppSheet } from "../components/AppSheet";
import type { FeatureBeatScene } from "../introFilm";
import { color, font } from "../theme";
import { ArrangeStage, CaptureStage, FinishStage, arrangeMove } from "./stages";

const stages = {
  capture: CaptureStage,
  arrange: ArrangeStage,
  finish: FinishStage,
} as const;

function ArrangeHeader() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const move = arrangeMove(frame, fps);

  return (
    <span style={{ position: "relative", display: "inline-grid" }}>
      <span style={{ opacity: 1 - move, gridArea: "1 / 1" }}>Inbox</span>
      <span style={{ opacity: move, gridArea: "1 / 1" }}>Today</span>
    </span>
  );
}

function sheetMeta(scene: FeatureBeatScene) {
  if (scene.id === "arrange") {
    return <ArrangeHeader />;
  }
  if (scene.id === "capture") {
    return "Inbox";
  }
  return "Today";
}

export function FeatureBeat({ scene }: { scene: FeatureBeatScene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 120 },
  });
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const Stage = stages[scene.id];

  return (
    <AbsoluteFill style={{ padding: "108px 96px 88px" }}>
      <div
        style={{
          display: "flex",
          height: "100%",
          alignItems: "center",
          gap: 56,
        }}
      >
        <div
          style={{
            width: 640,
            flexShrink: 0,
            opacity,
            transform: `translateY(${(1 - rise) * 16}px)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span
              style={{
                fontFamily: font.sans,
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: "0.14em",
                color: color.muted,
              }}
            >
              {scene.index}
            </span>
            <span
              style={{
                fontFamily: font.sans,
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: color.sienna,
              }}
            >
              {scene.title}
            </span>
          </div>
          <h1
            style={{
              margin: "18px 0 0",
              fontFamily: font.serif,
              fontSize: 92,
              fontWeight: 400,
              lineHeight: 0.92,
              letterSpacing: "-0.035em",
              color: color.ink,
              whiteSpace: "pre-line",
            }}
          >
            {scene.headline}
          </h1>
          <p
            style={{
              margin: "26px 0 0",
              maxWidth: 460,
              fontFamily: font.sans,
              fontSize: 28,
              lineHeight: 1.35,
              color: color.muted,
            }}
          >
            {scene.support}
          </p>
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
          <AppSheet meta={sheetMeta(scene)}>
            <Stage />
          </AppSheet>
        </div>
      </div>
    </AbsoluteFill>
  );
}
