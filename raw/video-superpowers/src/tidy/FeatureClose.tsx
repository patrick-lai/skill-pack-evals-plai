import { COLORS, TYPE } from "./brand";
import { FeatureStage, SheetChrome } from "./FeatureStage";
import { closeRowState } from "./motion";
import {
  CLOSE_ROWS,
  CLOSE_TOMORROW,
  beatById,
  featureById,
} from "./timeline";

const Check: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <svg width={34} height={34} viewBox="0 0 34 34" style={{ flexShrink: 0 }}>
      <circle
        cx={17}
        cy={17}
        r={13}
        fill={COLORS.celadon}
        fillOpacity={progress}
        stroke={progress > 0 ? COLORS.celadon : COLORS.inkSoft}
        strokeWidth={1.6}
      />
      <path
        d="M10 17.5 L15 22.2 L24.5 12"
        fill="none"
        stroke="#F7F1E7"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={22}
        strokeDashoffset={22 * (1 - progress)}
      />
    </svg>
  );
};

export const FeatureClose: React.FC<{ frame: number }> = ({ frame }) => {
  const feature = featureById("close");
  const beat = beatById("close");
  const local = frame - beat.start;

  return (
    <FeatureStage frame={frame} id={feature.id}>
      <SheetChrome label="Today" />
      <div
        style={{
          marginTop: 18,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
        }}
      >
        {CLOSE_ROWS.map((row) => {
          const state = closeRowState(local, row.kind);
          const resting = row.kind === "resting" || state.checked > 0.85;
          return (
            <div
              key={row.text}
              style={{
                display: "flex",
                alignItems: "center",
                height: 118,
                gap: 18,
                transform: `translateX(${state.moved * 16}px)`,
                borderBottom: `1px solid ${COLORS.line}`,
              }}
            >
              <Check progress={state.checked} />
              <span
                style={{
                  flex: 1,
                  fontFamily: TYPE.sans,
                  fontWeight: 450,
                  fontSize: 30,
                  color: COLORS.ink,
                  opacity: resting ? 0.62 : 1,
                }}
              >
                {row.text}
              </span>
              {row.kind === "tomorrow" ? (
                <span
                  style={{
                    opacity: state.moved,
                    background: COLORS.clayWash,
                    color: COLORS.clay,
                    fontFamily: TYPE.sans,
                    fontWeight: 550,
                    fontSize: 16,
                    letterSpacing: "0.04em",
                    padding: "8px 14px",
                    borderRadius: 999,
                  }}
                >
                  {CLOSE_TOMORROW}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </FeatureStage>
  );
};
