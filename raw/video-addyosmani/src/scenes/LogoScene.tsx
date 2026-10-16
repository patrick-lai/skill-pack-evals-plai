import { useVideoConfig } from "remotion";
import { RisingWord } from "../components/RisingWord";
import { TidyMark } from "../components/TidyMark";
import { font } from "../fonts";
import { unit } from "../motion";
import { theme } from "../theme";

export const LogoScene = ({ frame }: { frame: number }) => {
  const { fps } = useVideoConfig();
  const box = unit(frame, 2, 22);
  const check = unit(frame, 16, 36);
  const line = unit(frame, 34, 48);
  const tag = unit(frame, 40, 54);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: "translateY(-28px)",
      }}
    >
      <div style={{ opacity: box, transform: `scale(${0.92 + box * 0.08})` }}>
        <TidyMark size={132} box={box} check={check} />
      </div>
      <div style={{ marginTop: 28 }}>
        <RisingWord
          text="Tidy"
          frame={frame}
          fps={fps}
          delay={18}
          fontFamily={font.display}
          fontSize={156}
          color={theme.cream}
        />
      </div>
      <div
        style={{
          marginTop: 26,
          width: 72,
          height: 3,
          background: theme.persimmon,
          transform: `scaleX(${line})`,
        }}
      />
      <div
        style={{
          marginTop: 22,
          opacity: tag,
          fontFamily: font.display,
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: 36,
          color: theme.creamDim,
        }}
      >
        Put the day away.
      </div>
    </div>
  );
};
