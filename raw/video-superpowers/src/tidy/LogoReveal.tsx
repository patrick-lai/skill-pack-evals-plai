import { AbsoluteFill } from "remotion";
import { COLORS, TYPE } from "./brand";
import { LogoMark } from "./LogoMark";
import { endLineOpacity, logoWordmarkOpacity } from "./motion";
import { LOGO, beatById } from "./timeline";

export const LogoReveal: React.FC<{ frame: number; fps: number }> = ({
  frame,
  fps,
}) => {
  const beat = beatById("logo");
  if (frame < beat.start || frame >= beat.end) return null;

  const word = logoWordmarkOpacity(frame);
  const line = endLineOpacity(frame, 36);

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
        <LogoMark frame={frame} fps={fps} size={132} />
        <div
          style={{
            marginTop: 28,
            fontFamily: TYPE.display,
            fontWeight: 560,
            fontSize: 136,
            lineHeight: 0.9,
            letterSpacing: "-0.045em",
            color: COLORS.ink,
            opacity: word,
            transform: `translateY(${(1 - word) * 16}px)`,
            fontVariationSettings: '"opsz" 144, "SOFT" 50, "WONK" 1, "wght" 560',
          }}
        >
          {LOGO.wordmark}
        </div>
        <div
          style={{
            marginTop: 22,
            width: 168 * word,
            height: 3,
            borderRadius: 2,
            background: COLORS.celadon,
          }}
        />
        <div
          style={{
            marginTop: 20,
            fontFamily: TYPE.display,
            fontStyle: "italic",
            fontWeight: 460,
            fontSize: 36,
            color: COLORS.inkSoft,
            opacity: line,
            fontVariationSettings: '"opsz" 48, "SOFT" 40, "WONK" 1, "wght" 460',
          }}
        >
          {LOGO.line}
        </div>
      </div>
    </AbsoluteFill>
  );
};
