import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TaskRow } from "../components/TaskRow";
import { color, font } from "../theme";

const captureLine = "Call the landlord";

export function CaptureStage() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const typed = Math.max(
    0,
    Math.min(
      captureLine.length,
      Math.floor(interpolate(frame, [8, 34], [0, captureLine.length], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })),
    ),
  );
  const committed = frame >= 40;
  const rowIn = spring({
    frame: frame - 38,
    fps,
    config: { damping: 14, stiffness: 140, mass: 0.7 },
  });
  const caretOn = !committed && Math.floor(frame / 8) % 2 === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          height: 72,
          borderRadius: 18,
          border: `1.5px solid ${color.ink}`,
          backgroundColor: color.white,
          display: "flex",
          alignItems: "center",
          padding: "0 18px",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            fontFamily: font.sans,
            fontSize: 22,
            fontWeight: 500,
            color: committed ? color.muted : color.ink,
          }}
        >
          {committed ? "Add a task" : captureLine.slice(0, typed)}
        </span>
        {caretOn ? (
          <span
            style={{
              width: 2,
              height: 26,
              marginLeft: 2,
              backgroundColor: color.sienna,
            }}
          />
        ) : null}
      </div>
      <div
        style={{
          opacity: frame < 38 ? 0 : rowIn,
          transform: `translateY(${(1 - rowIn) * 16}px)`,
        }}
      >
        <TaskRow label={captureLine} />
      </div>
      <TaskRow label="Buy filter coffee" dim />
    </div>
  );
}

const arrangeTasks = [
  {
    label: "Renew the lease",
    from: { x: 0, y: 36 },
    to: { x: 0, y: 40 },
  },
  {
    label: "Pack the closet",
    from: { x: 0, y: 122 },
    to: { x: 0, y: 126 },
  },
  {
    label: "Book the train",
    from: { x: 0, y: 208 },
    to: { x: 364, y: 40 },
  },
];

export function arrangeMove(frame: number, fps: number) {
  const split = spring({
    frame: frame - 16,
    fps,
    config: { damping: 18, stiffness: 80, mass: 0.9 },
  });
  return Math.min(1, Math.max(0, split));
}

export function ArrangeStage() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const move = arrangeMove(frame, fps);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <ColumnLabel left={0} top={0} opacity={1 - move} text="Inbox" />
      <ColumnLabel left={0} top={0} opacity={move} text="Today" />
      <ColumnLabel left={364} top={0} opacity={move} text="Later" />
      {arrangeTasks.map((task) => (
        <div
          key={task.label}
          style={{
            position: "absolute",
            left: interpolate(move, [0, 1], [task.from.x, task.to.x]),
            top: interpolate(move, [0, 1], [task.from.y, task.to.y]),
            width: interpolate(move, [0, 1], [704, 340]),
          }}
        >
          <TaskRow label={task.label} />
        </div>
      ))}
    </div>
  );
}

export function FinishStage() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const checked = interpolate(frame, [14, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const strike = interpolate(frame, [22, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const clear = spring({
    frame: frame - 46,
    fps,
    config: { damping: 18, stiffness: 90 },
  });
  const rowOpacity = interpolate(frame, [46, 60], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <div
        style={{
          opacity: rowOpacity,
          transform: `translateY(${(1 - rowOpacity) * -12}px)`,
        }}
      >
        <TaskRow label="Renew the lease" checked={checked} strike={strike} />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: clear,
          transform: `translateY(${(1 - clear) * 12}px)`,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: font.serif,
              fontSize: 56,
              color: color.ink,
              letterSpacing: "-0.03em",
            }}
          >
            Today is clear.
          </div>
          <div
            style={{
              marginTop: 10,
              fontFamily: font.sans,
              fontSize: 20,
              color: color.muted,
            }}
          >
            Nothing left for today.
          </div>
        </div>
      </div>
    </div>
  );
}

function ColumnLabel({
  left,
  top,
  opacity,
  text,
}: {
  left: number;
  top: number;
  opacity: number;
  text: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        opacity,
        fontFamily: font.sans,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: color.muted,
      }}
    >
      {text}
    </div>
  );
}
