import { AbsoluteFill } from "remotion";
import { color } from "../theme";

export function Background() {
  return (
    <AbsoluteFill style={{ backgroundColor: color.paper }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(880px 520px at 12% 0%, rgba(194, 77, 42, 0.10), transparent 62%), radial-gradient(760px 560px at 100% 100%, rgba(36, 86, 63, 0.10), transparent 58%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 10,
          backgroundColor: color.sienna,
        }}
      />
    </AbsoluteFill>
  );
}
