import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import {
  DURATION_IN_FRAMES,
  localFrameFor,
  SCENES,
  sceneIndexAt,
} from "./edit";
import { font } from "./fonts";
import { slideCamera } from "./motion";
import { CaptureScene } from "./scenes/CaptureScene";
import { CloseScene } from "./scenes/CloseScene";
import { EndScene } from "./scenes/EndScene";
import { LogoScene } from "./scenes/LogoScene";
import { TodayScene } from "./scenes/TodayScene";
import { theme } from "./theme";

const scenes = {
  logo: LogoScene,
  capture: CaptureScene,
  today: TodayScene,
  close: CloseScene,
  end: EndScene,
};

export const TidyFilm = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const index = sceneIndexAt(frame);
  const camera = slideCamera(frame - SCENES[index].from, index);
  const progress = frame / Math.max(1, DURATION_IN_FRAMES - 1);

  return (
    <AbsoluteFill style={{ backgroundColor: theme.desk, fontFamily: font.sans }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 38%, rgba(92, 58, 40, 0.45) 0%, rgba(26, 22, 19, 0) 58%)",
        }}
      />
      <div style={{ position: "absolute", width, height, overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            width: width * SCENES.length,
            height,
            transform: `translateX(${-camera * width}px)`,
          }}
        >
          {SCENES.map((scene) => {
            const Scene = scenes[scene.id];
            return (
              <div
                key={scene.id}
                style={{ width, height, position: "relative", flex: "0 0 auto" }}
              >
                <Scene frame={localFrameFor(frame, scene.id)} />
              </div>
            );
          })}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          inset: 28,
          border: `1px solid ${theme.frame}`,
          borderRadius: 22,
          pointerEvents: "none",
        }}
      />
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.07,
          pointerEvents: "none",
          mixBlendMode: "overlay",
        }}
      >
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      <div
        style={{
          position: "absolute",
          left: 128,
          right: 128,
          bottom: 52,
          height: 2,
          background: theme.track,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: theme.persimmon,
            transform: `scaleX(${progress})`,
            transformOrigin: "left center",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
