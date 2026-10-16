import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, TYPE } from "./tidy/brand";
import { EndCard } from "./tidy/EndCard";
import { FeatureCapture } from "./tidy/FeatureCapture";
import { FeatureClose } from "./tidy/FeatureClose";
import { FeaturePlace } from "./tidy/FeaturePlace";
import { useTidyFonts } from "./tidy/fonts";
import { LogoReveal } from "./tidy/LogoReveal";

export const TidyIntro: React.FC = () => {
  useTidyFonts();
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const progress = (frame + 1) / durationInFrames;

  return (
    <AbsoluteFill
      style={{
        background: COLORS.paper,
        fontFamily: TYPE.sans,
        color: COLORS.ink,
      }}
    >
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(255,252,246,0.72) 0%, rgba(239,231,218,0) 62%)",
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.18,
          backgroundImage:
            "radial-gradient(rgba(28,23,18,0.55) 0.6px, transparent 0.65px)",
          backgroundSize: "4px 4px",
          pointerEvents: "none",
        }}
      />
      <LogoReveal frame={frame} fps={fps} />
      <FeatureCapture frame={frame} />
      <FeaturePlace frame={frame} />
      <FeatureClose frame={frame} />
      <EndCard frame={frame} fps={fps} />
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          height: 4,
          width: `${progress * 100}%`,
          background: COLORS.celadon,
        }}
      />
    </AbsoluteFill>
  );
};
