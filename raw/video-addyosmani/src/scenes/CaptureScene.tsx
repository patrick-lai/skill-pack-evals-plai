import { interpolate, useVideoConfig } from "remotion";
import { FeatureLayout } from "../components/FeatureLayout";
import { PaperCard } from "../components/PaperCard";
import { font } from "../fonts";
import { settle } from "../motion";
import { theme } from "../theme";

const NOTES = [
  { label: "Call mom", x: 28, y: 36, rotate: -11, slot: 0 },
  { label: "Q3 deck", x: 390, y: 8, rotate: 8, slot: 1 },
  { label: "Oat milk", x: 150, y: 250, rotate: -4, slot: 2 },
];

export const CaptureScene = ({ frame }: { frame: number }) => {
  const { fps } = useVideoConfig();
  const filed = NOTES.filter((_, index) => settle(frame, fps, 18 + index * 4) > 0.85).length;

  return (
    <FeatureLayout
      frame={frame}
      index="01"
      title="Capture"
      body="A thought lands. Tidy files it."
    >
      <PaperCard label="Inbox" meta={filed === 0 ? "Loose" : `${filed} filed`}>
        {NOTES.map((note, index) => {
          const progress = settle(frame, fps, 18 + index * 4);
          const x = interpolate(progress, [0, 1], [note.x, 0]);
          const y = interpolate(progress, [0, 1], [note.y, note.slot * 96]);
          const rotate = interpolate(progress, [0, 1], [note.rotate, 0]);
          const width = interpolate(progress, [0, 1], [230, 788]);
          return (
            <div
              key={note.label}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width,
                height: 78,
                borderRadius: interpolate(progress, [0, 1], [16, 0]),
                background: progress > 0.65 ? "transparent" : theme.scrap,
                boxShadow:
                  progress > 0.65
                    ? "none"
                    : "0 14px 30px rgba(36, 28, 22, 0.12)",
                transform: `rotate(${rotate}deg)`,
                display: "flex",
                alignItems: "center",
                padding: "0 18px",
                gap: 14,
                borderBottom:
                  progress > 0.65 ? `1px solid ${theme.line}` : "none",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 99,
                  border: `2px solid ${theme.ink}`,
                  opacity: progress,
                  flex: "0 0 auto",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: 22,
                  fontFamily: font.display,
                  fontStyle: "italic",
                  fontWeight: 500,
                  fontSize: 28,
                  color: theme.ink,
                  opacity: 1 - progress,
                }}
              >
                {note.label}
              </span>
              <span
                style={{
                  fontFamily: font.sans,
                  fontWeight: 500,
                  fontSize: 26,
                  color: theme.ink,
                  opacity: progress,
                }}
              >
                {note.label}
              </span>
            </div>
          );
        })}
      </PaperCard>
    </FeatureLayout>
  );
};
