import { Composition } from "remotion";
import { introFilm } from "./introFilm";
import { TidyIntro } from "./TidyIntro";

export function RemotionRoot() {
  const film = introFilm();

  return (
    <Composition
      id={film.id}
      component={TidyIntro}
      durationInFrames={film.durationInFrames}
      fps={film.fps}
      width={film.width}
      height={film.height}
    />
  );
}
