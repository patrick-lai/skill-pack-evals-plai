import { interpolate } from "remotion";
import { FeatureLayout } from "../components/FeatureLayout";
import { PaperCard } from "../components/PaperCard";
import { TaskRow } from "../components/TaskRow";
import { TidyMark } from "../components/TidyMark";
import { font } from "../fonts";
import { unit } from "../motion";
import { theme } from "../theme";

const ITEMS = ["Write the brief", "Review with Lea", "Ship the cut"];

export const CloseScene = ({ frame }: { frame: number }) => {
  const clear = unit(frame, 60, 74);
  const remaining = ITEMS.filter((_, index) => unit(frame, 38 + index * 6, 54 + index * 6) < 0.5).length;

  return (
    <FeatureLayout
      frame={frame}
      index="03"
      title="Close"
      body="Finished work leaves the desk."
    >
      <PaperCard label="Done" meta={remaining === 0 ? "0 left" : `${remaining} open`}>
        {ITEMS.map((title, index) => {
          const check = unit(frame, 8 + index * 7, 22 + index * 7);
          const leave = unit(frame, 36 + index * 6, 52 + index * 6);
          return (
            <div
              key={title}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: index * 76,
                opacity: 1 - leave,
                transform: `translateX(${interpolate(leave, [0, 1], [0, 200])}px)`,
              }}
            >
              <TaskRow title={title} check={check} strike={check} />
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            opacity: clear,
            transform: `translateY(${(1 - clear) * 16}px)`,
          }}
        >
          <TidyMark
            size={72}
            box={clear}
            check={clear}
            stroke={theme.ink}
          />
          <div
            style={{
              fontFamily: font.display,
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: 42,
              color: theme.ink,
            }}
          >
            Clear.
          </div>
        </div>
      </PaperCard>
    </FeatureLayout>
  );
};
