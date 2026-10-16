import { COLORS, TYPE } from "./brand";
import { FeatureStage, SheetChrome } from "./FeatureStage";
import { captureChipVisible, typedText } from "./motion";
import { CAPTURE, beatById, featureById } from "./timeline";

export const FeatureCapture: React.FC<{ frame: number }> = ({ frame }) => {
  const feature = featureById("capture");
  const beat = beatById("capture");
  const local = frame - beat.start;
  const typed = typedText(
    CAPTURE.text,
    local,
    CAPTURE.typeStart,
    CAPTURE.framesPerChar,
  );
  const chip = captureChipVisible(local);
  const caretOn = Math.floor(local / 8) % 2 === 0;

  return (
    <FeatureStage frame={frame} id={feature.id}>
      <SheetChrome label={CAPTURE.label} />
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            minHeight: 104,
            borderRadius: 20,
            background: "#FBF7F1",
            border: `1px solid ${COLORS.line}`,
            display: "flex",
            alignItems: "center",
            padding: "0 28px",
            gap: 18,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              minHeight: 40,
              fontFamily: TYPE.sans,
              fontWeight: 450,
              fontSize: 34,
              color: COLORS.ink,
            }}
          >
            <span>{typed}</span>
            {chip ? null : (
              <span
                style={{
                  display: "inline-block",
                  width: 2,
                  height: 34,
                  marginLeft: 3,
                  background: COLORS.ink,
                  opacity: caretOn ? 1 : 0,
                }}
              />
            )}
          </div>
          {chip ? (
            <span
              style={{
                background: COLORS.celadonWash,
                color: COLORS.celadon,
                fontFamily: TYPE.sans,
                fontWeight: 550,
                fontSize: 18,
                letterSpacing: "0.02em",
                padding: "8px 14px",
                borderRadius: 999,
              }}
            >
              {CAPTURE.chip}
            </span>
          ) : null}
        </div>
      </div>
    </FeatureStage>
  );
};
