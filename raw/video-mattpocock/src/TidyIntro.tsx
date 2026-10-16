import { AbsoluteFill, Sequence } from "remotion";
import { Background } from "./components/Background";
import { introFilm, type Scene } from "./introFilm";
import { EndCard } from "./scenes/EndCard";
import { FeatureBeat } from "./scenes/FeatureBeat";
import { LogoReveal } from "./scenes/LogoReveal";

export function TidyIntro() {
  const film = introFilm();

  return (
    <AbsoluteFill>
      <Background />
      {film.scenes.map((scene) => (
        <Sequence key={scene.id} from={scene.from} durationInFrames={scene.durationInFrames}>
          <SceneView scene={scene} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

function SceneView({ scene }: { scene: Scene }) {
  switch (scene.role) {
    case "logo-reveal":
      return <LogoReveal scene={scene} />;
    case "feature-beat":
      return <FeatureBeat scene={scene} />;
    case "end-card":
      return <EndCard scene={scene} />;
  }
}
