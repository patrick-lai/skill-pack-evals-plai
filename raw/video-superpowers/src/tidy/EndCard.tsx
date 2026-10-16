import { AbsoluteFill } from "remotion";
import { COLORS, TYPE } from "./brand";
import { LogoMark } from "./LogoMark";
import { endLineOpacity } from "./motion";
import { END_CARD, beatById } from "./timeline";

export const EndCard: React.FC<{ frame: number; fps: number }> = ({
  frame,
  fps,
}) => {
  const beat = beatById("end");
  if (frame < beat.start || frame >= beat.end) return null;

  const local = frame - beat.start;
  const line = endLineOpacity(local, 10);
  const url = endLineOpacity(local, 22);

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <LogoMark frame={90} fps={fps} size={118} />
        <div
          style={{
            marginTop: 26,
            fontFamily: TYPE.display,
            fontWeight: 560,
            fontSize: 124,
            lineHeight: 0.9,
            letterSpacing: "-0.045em",
            color: COLORS.ink,
            fontVariationSettings:
              '"opsz" 144, "SOFT" 50, "WONK" 1, "wght" 560',
          }}
        >
          {END_CARD.wordmark}
        </div>
        <div
          style={{
            marginTop: 16,
            fontFamily: TYPE.display,
            fontStyle: "italic",
            fontWeight: 460,
            fontSize: 36,
            color: COLORS.inkSoft,
            opacity: line,
            transform: `translateY(${(1 - line) * 12}px)`,
            fontVariationSettings:
              '"opsz" 48, "SOFT" 40, "WONK" 1, "wght" 460',
          }}
        >
          {END_CARD.line}
        </div>
        <div
          style={{
            marginTop: 36,
            opacity: url,
            transform: `translateY(${(1 - url) * 10}px)`,
            border: `1.5px solid ${COLORS.ink}`,
            borderRadius: 999,
            padding: "12px 26px",
            fontFamily: TYPE.sans,
            fontWeight: 500,
            fontSize: 22,
            letterSpacing: "0.06em",
            color: COLORS.ink,
          }}
        >
          {END_CARD.url}
        </div>
      </div>
    </AbsoluteFill>
  );
};
