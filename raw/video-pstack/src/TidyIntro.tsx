import { AbsoluteFill, Series } from "remotion";
import { BeatView } from "./beats";
import { CornerMark, Paper, Progress } from "./components";
import { theme } from "./theme";
import { timeline } from "./timeline";

export const TidyIntro = () => {
  return (
    <AbsoluteFill style={{ background: theme.paper, fontFamily: "Outfit, sans-serif" }}>
      <Paper />
      <Series>
        {timeline.beats.map((beat) => (
          <Series.Sequence key={beat.id} durationInFrames={beat.frames}>
            <BeatView beat={beat} />
          </Series.Sequence>
        ))}
      </Series>
      <CornerMark />
      <Progress />
    </AbsoluteFill>
  );
};
