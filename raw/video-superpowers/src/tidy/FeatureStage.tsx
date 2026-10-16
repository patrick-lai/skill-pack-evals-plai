import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, TYPE } from "./brand";
import { LogoMark } from "./LogoMark";
import { entrance } from "./motion";
import { beatById, featureById, type FeatureId } from "./timeline";

const sheet: React.CSSProperties = {
  width: 800,
  height: 640,
  flexShrink: 0,
  background: COLORS.paperRaised,
  borderRadius: 32,
  border: `1px solid ${COLORS.line}`,
  boxShadow: `0 28px 70px ${COLORS.shadow}`,
  padding: "36px 40px 32px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
};

export const SheetChrome: React.FC<{ label: string }> = ({ label }) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <LogoMark frame={90} fps={30} size={34} />
        <span
          style={{
            fontFamily: TYPE.display,
            fontWeight: 560,
            fontSize: 22,
            letterSpacing: "-0.03em",
            color: COLORS.ink,
            fontVariationSettings: '"opsz" 36, "SOFT" 30, "WONK" 1, "wght" 560',
          }}
        >
          Tidy
        </span>
      </div>
      <span
        style={{
          fontFamily: TYPE.sans,
          fontWeight: 500,
          fontSize: 15,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: COLORS.inkSoft,
        }}
      >
        {label}
      </span>
    </div>
  );
};

export const FeatureStage: React.FC<{
  frame: number;
  id: FeatureId;
  children: ReactNode;
}> = ({ frame, id, children }) => {
  const beat = beatById(id);
  if (frame < beat.start || frame >= beat.end) return null;

  const feature = featureById(id);
  const local = frame - beat.start;
  const enter = entrance(local);

  return (
    <AbsoluteFill style={{ opacity: enter.opacity }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 112px",
          boxSizing: "border-box",
          transform: `translateY(${enter.offsetY}px)`,
        }}
      >
        <div style={{ width: 740 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 14,
              marginBottom: 22,
            }}
          >
            <span
              style={{
                fontFamily: TYPE.display,
                fontWeight: 560,
                fontSize: 34,
                color: COLORS.celadon,
                fontVariationSettings:
                  '"opsz" 48, "SOFT" 40, "WONK" 1, "wght" 560',
              }}
            >
              {feature.index}
            </span>
            <span
              style={{
                fontFamily: TYPE.sans,
                fontWeight: 500,
                fontSize: 18,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: COLORS.inkSoft,
              }}
            >
              {feature.name}
            </span>
          </div>
          <h1
            style={{
              fontFamily: TYPE.display,
              fontWeight: 560,
              fontSize: 76,
              lineHeight: 0.96,
              letterSpacing: "-0.035em",
              margin: 0,
              color: COLORS.ink,
              textWrap: "balance",
              fontVariationSettings:
                '"opsz" 144, "SOFT" 30, "WONK" 1, "wght" 560',
            }}
          >
            {feature.title}
          </h1>
          <p
            style={{
              fontFamily: TYPE.sans,
              fontWeight: 400,
              fontSize: 28,
              lineHeight: 1.35,
              color: COLORS.inkSoft,
              margin: "26px 0 0",
              maxWidth: 540,
            }}
          >
            {feature.body}
          </p>
        </div>
        <div style={sheet}>{children}</div>
      </div>
    </AbsoluteFill>
  );
};
