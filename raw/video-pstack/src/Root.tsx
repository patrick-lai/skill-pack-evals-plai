import { Composition } from "remotion";
import { TidyIntro } from "./TidyIntro";
import { timeline, totalFrames } from "./timeline";

export const RemotionRoot = () => {
  return (
    <Composition
      id="TidyIntro"
      component={TidyIntro}
      durationInFrames={totalFrames(timeline)}
      fps={timeline.fps}
      width={timeline.width}
      height={timeline.height}
    />
  );
};
