import { interpolate, useVideoConfig } from "remotion";
import { FeatureLayout } from "../components/FeatureLayout";
import { PaperCard } from "../components/PaperCard";
import { TaskRow } from "../components/TaskRow";
import { settle } from "../motion";

const ROWS = [
  { title: "Write the brief", time: "9:00", keep: true },
  { title: "Review with Lea", time: "11:30", keep: true },
  { title: "Dentist", time: "14:00", keep: false },
  { title: "Ship the cut", time: "16:00", keep: true },
  { title: "Inbox zero", time: "Later", keep: false },
  { title: "Groceries", time: "Sat", keep: false },
];

const ROW = 76;

export const TodayScene = ({ frame }: { frame: number }) => {
  const { fps } = useVideoConfig();
  const progress = settle(frame, fps, 16);
  let keepCursor = 0;
  const rows = ROWS.map((row, index) => {
    const keepIndex = row.keep ? keepCursor++ : -1;
    return { ...row, index, keepIndex };
  });
  const left = rows.filter((row) => row.keep).length;

  return (
    <FeatureLayout
      frame={frame}
      index="02"
      title="Today"
      body="The day holds only what fits."
    >
      <PaperCard label="Thursday" meta={progress > 0.7 ? `${left} today` : "6 open"}>
        {rows.map((row) => {
          const y = row.keep
            ? interpolate(progress, [0, 1], [row.index * ROW, row.keepIndex * ROW])
            : row.index * ROW;
          const x = row.keep ? 0 : interpolate(progress, [0, 1], [0, 180]);
          const opacity = row.keep ? 1 : 1 - progress;
          return (
            <div
              key={row.title}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: y,
                transform: `translateX(${x}px)`,
                opacity,
              }}
            >
              <TaskRow title={row.title} time={row.time} />
            </div>
          );
        })}
      </PaperCard>
    </FeatureLayout>
  );
};
