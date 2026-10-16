import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

const FACES = [
  {
    family: "Fraunces",
    file: "fonts/fraunces-latin-full-normal.woff2",
    style: "normal",
  },
  {
    family: "Fraunces",
    file: "fonts/fraunces-latin-full-italic.woff2",
    style: "italic",
  },
  {
    family: "Outfit",
    file: "fonts/outfit-latin-wght-normal.woff2",
    style: "normal",
  },
] as const;

export function useTidyFonts(): void {
  const [handle] = useState(() => delayRender("Loading Tidy fonts"));

  useEffect(() => {
    const faces = FACES.map(
      (face) =>
        new FontFace(
          face.family,
          `url(${staticFile(face.file)}) format("woff2")`,
          {
            weight: "100 900",
            style: face.style,
            display: "block",
          },
        ),
    );

    Promise.all(
      faces.map((face) =>
        face.load().then((loaded) => {
          document.fonts.add(loaded);
        }),
      ),
    )
      .then(() => continueRender(handle))
      .catch((error: unknown) => {
        console.error(error);
        continueRender(handle);
      });
  }, [handle]);
}
