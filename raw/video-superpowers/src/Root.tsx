import { Composition } from "remotion";
import { TidyIntro } from "./TidyIntro";
import { COMPOSITION } from "./tidy/timeline";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id={COMPOSITION.id}
      component={TidyIntro}
      durationInFrames={COMPOSITION.durationInFrames}
      fps={COMPOSITION.fps}
      width={COMPOSITION.width}
      height={COMPOSITION.height}
    />
  );
};
