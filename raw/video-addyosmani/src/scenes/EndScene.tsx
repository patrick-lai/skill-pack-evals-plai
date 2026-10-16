import { useVideoConfig } from "remotion";
import { RisingWord } from "../components/RisingWord";
import { TidyMark } from "../components/TidyMark";
import { font } from "../fonts";
import { unit } from "../motion";
import { theme } from "../theme";

export const EndScene = ({ frame }: { frame: number }) => {
  const { fps } = useVideoConfig();
  const box = unit(frame, 2, 16);
  const check = unit(frame, 10, 24);
  const line = unit(frame, 22, 34);
  const pill = unit(frame, 30, 44);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: "translateY(-16px)",
      }}
    >
      <TidyMark size={96} box={box} check={check} />
      <div style={{ marginTop: 22 }}>
        <RisingWord
          text="Tidy"
          frame={frame}
          fps={fps}
          delay={8}
          fontFamily={font.display}
          fontSize={120}
          color={theme.cream}
        />
      </div>
      <div
        style={{
          marginTop: 22,
          opacity: line,
          fontFamily: font.display,
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: 34,
          color: theme.creamDim,
        }}
      >
        The task app for a clear desk.
      </div>
      <div
        style={{
          marginTop: 28,
          opacity: pill,
          transform: `translateY(${(1 - pill) * 12}px)`,
          border: `1px solid ${theme.frame}`,
          borderRadius: 999,
          padding: "10px 18px",
          fontFamily: font.sans,
          fontWeight: 500,
          fontSize: 20,
          letterSpacing: "0.08em",
          color: theme.cream,
        }}
      >
        tidy.app
      </div>
    </div>
  );
};
