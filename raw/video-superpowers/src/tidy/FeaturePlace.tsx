import { COLORS, TYPE } from "./brand";
import { FeatureStage, SheetChrome } from "./FeatureStage";
import { lerp, placeProgress } from "./motion";
import { PLACE, beatById, featureById } from "./timeline";

const LANE_HEIGHT = 132;
const LANE_GAP = 16;
const LABEL_WIDTH = 156;
const CARD_HEIGHT = 76;

export const FeaturePlace: React.FC<{ frame: number }> = ({ frame }) => {
  const feature = featureById("place");
  const beat = beatById("place");
  const local = frame - beat.start;
  const progress = placeProgress(local, PLACE.moveStart, PLACE.moveDuration);
  const laneTop = (index: number) => index * (LANE_HEIGHT + LANE_GAP);
  const cardTop = lerp(
    laneTop(0) + (LANE_HEIGHT - CARD_HEIGHT) / 2,
    laneTop(1) + (LANE_HEIGHT - CARD_HEIGHT) / 2,
    progress,
  );

  return (
    <FeatureStage frame={frame} id={feature.id}>
      <SheetChrome label={progress > 0.85 ? PLACE.target : "Not placed"} />
      <div style={{ position: "relative", marginTop: 28, flex: 1 }}>
        {PLACE.lanes.map((lane) => {
          const active = lane === PLACE.target;
          return (
            <div
              key={lane}
              style={{
                height: LANE_HEIGHT,
                marginBottom: LANE_GAP,
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: LABEL_WIDTH,
                  flexShrink: 0,
                  fontFamily: TYPE.sans,
                  fontWeight: 500,
                  fontSize: 15,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color:
                    active && progress > 0.85 ? COLORS.celadon : COLORS.inkSoft,
                }}
              >
                {lane}
              </div>
              <div
                style={{
                  flex: 1,
                  height: "100%",
                  borderRadius: 18,
                  boxSizing: "border-box",
                  border: `1px solid ${active && progress > 0.85 ? COLORS.celadon : COLORS.line}`,
                  background: active
                    ? `rgba(215, 232, 222, ${progress})`
                    : "rgba(255,252,246,0.35)",
                }}
              />
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: LABEL_WIDTH + 16 + 18,
            right: 18,
            top: cardTop,
            height: CARD_HEIGHT,
            borderRadius: 16,
            background: "#FBF7F1",
            border: `1px solid ${COLORS.line}`,
            boxShadow: `0 14px 34px ${COLORS.shadow}`,
            display: "flex",
            alignItems: "center",
            padding: "0 22px",
            gap: 14,
            transform: `rotate(${lerp(-2.4, 0, progress)}deg)`,
            fontFamily: TYPE.sans,
            fontWeight: 450,
            fontSize: 28,
            color: COLORS.ink,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: COLORS.celadon,
              flexShrink: 0,
            }}
          />
          {PLACE.text}
        </div>
      </div>
    </FeatureStage>
  );
};
