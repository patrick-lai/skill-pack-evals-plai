import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Check } from "./components";
import { sans, serif, theme } from "./theme";
import type { Beat, CaptureBeat, DoneBeat, EndBeat, TaskLine, TodayBeat } from "./timeline";

const stage = {
  position: "absolute" as const,
  left: 160,
  top: 440,
  width: 920,
};

const card = {
  background: theme.card,
  border: `1px solid ${theme.line}`,
  borderRadius: 22,
  boxShadow: "0 20px 50px rgba(70, 48, 24, 0.08)",
};

function fade(frame: number, from: number, to: number): number {
  return interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
}

function Kicker({ n, title }: { n: string; title: string }) {
  return (
    <div style={{ position: "absolute", left: 160, top: 188, width: 1280 }}>
      <div
        style={{
          fontFamily: sans,
          fontSize: 18,
          letterSpacing: "0.22em",
          color: theme.mute,
          fontWeight: 500,
        }}
      >
        {n}
      </div>
      <div
        style={{
          marginTop: 16,
          fontFamily: serif,
          fontWeight: 500,
          fontSize: 92,
          lineHeight: 0.98,
          color: theme.ink,
          letterSpacing: "-0.035em",
        }}
      >
        {title}
      </div>
    </div>
  );
}

function TaskRow({
  label,
  when,
  checkProgress,
}: {
  label: string;
  when: "today" | "later" | "none";
  checkProgress: number;
}) {
  const checked = checkProgress > 0;
  return (
    <div
      style={{
        ...card,
        minHeight: 108,
        display: "flex",
        alignItems: "center",
        gap: 22,
        padding: "0 28px",
        borderLeft: when === "today" ? `6px solid ${theme.today}` : undefined,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          border: `2px solid ${checked ? theme.stamp : theme.line}`,
          display: "grid",
          placeItems: "center",
          flex: "none",
        }}
      >
        {checked ? <Check progress={checkProgress} size={26} color={theme.stamp} /> : null}
      </div>
      <div
        style={{
          flex: 1,
          fontFamily: sans,
          fontSize: 32,
          fontWeight: 500,
          color: when === "later" ? theme.mute : theme.ink,
        }}
      >
        {label}
      </div>
      {when === "none" ? null : (
        <div
          style={{
            fontFamily: sans,
            fontSize: 14,
            letterSpacing: "0.16em",
            fontWeight: 500,
            color: when === "today" ? theme.today : theme.mute,
          }}
        >
          {when === "today" ? "TODAY" : "LATER"}
        </div>
      )}
    </div>
  );
}

function Capture({ task, frame }: { task: string; frame: number }) {
  const count = Math.floor(
    interpolate(frame, [16, 68], [0, task.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const shown = task.slice(0, count);
  const caretOn = count < task.length;
  return (
    <div style={stage}>
      <TaskRow label="" when="none" checkProgress={0} />
      <div
        style={{
          position: "absolute",
          left: 86,
          top: 0,
          height: 108,
          display: "flex",
          alignItems: "center",
          fontFamily: sans,
          fontSize: 32,
          fontWeight: 500,
          color: theme.ink,
        }}
      >
        <span>{shown}</span>
        <span
          style={{
            display: "inline-block",
            width: 2,
            height: 34,
            marginLeft: 2,
            background: theme.stamp,
            opacity: caretOn ? 1 : 0,
          }}
        />
      </div>
    </div>
  );
}

function Today({ rows, frame }: { rows: readonly TaskLine[]; frame: number }) {
  const leave = interpolate(frame, [18, 52], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  return (
    <div style={{ ...stage, display: "flex", flexDirection: "column", gap: 16 }}>
      {rows.map((row) => {
        const later = row.when === "later";
        return (
          <div
            key={row.id}
            style={{
              transform: `translateY(${later ? leave * 64 : 0}px)`,
              opacity: later ? 1 - leave : 1,
            }}
          >
            <TaskRow label={row.label} when={row.when} checkProgress={0} />
          </div>
        );
      })}
    </div>
  );
}

function Done({ task, empty, frame }: { task: string; empty: string; frame: number }) {
  const draw = fade(frame, 12, 34);
  const leave = interpolate(frame, [42, 66], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  const emptyIn = fade(frame, 58, 76);
  return (
    <div style={stage}>
      <div style={{ opacity: 1 - leave, transform: `translateY(${leave * -36}px)` }}>
        <TaskRow label={task} when="today" checkProgress={draw} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 34,
          fontFamily: serif,
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: 40,
          color: theme.mute,
          opacity: emptyIn,
        }}
      >
        {empty}
      </div>
    </div>
  );
}

function FeatureBeat({ beat }: { beat: CaptureBeat | TodayBeat | DoneBeat }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 0, 12) }}>
      <Kicker n={beat.kicker} title={beat.title} />
      <FeatureStage beat={beat} frame={frame} />
    </AbsoluteFill>
  );
}

function FeatureStage({
  beat,
  frame,
}: {
  beat: CaptureBeat | TodayBeat | DoneBeat;
  frame: number;
}) {
  switch (beat.id) {
    case "capture":
      return <Capture task={beat.task} frame={frame} />;
    case "today":
      return <Today rows={beat.rows} frame={frame} />;
    case "done":
      return <Done task={beat.task} empty={beat.empty} frame={frame} />;
    default: {
      const neverBeat: never = beat;
      return neverBeat;
    }
  }
}

function LogoBeat() {
  const frame = useCurrentFrame();
  const draw = fade(frame, 8, 40);
  const word = fade(frame, 26, 50);
  return (
    <AbsoluteFill style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <Check progress={draw} size={128} color={theme.stamp} />
        <div
          style={{
            fontFamily: serif,
            fontSize: 132,
            fontWeight: 500,
            color: theme.ink,
            letterSpacing: "-0.04em",
            opacity: word,
            transform: `translateY(${(1 - word) * 18}px)`,
          }}
        >
          Tidy
        </div>
      </div>
    </AbsoluteFill>
  );
}

function EndCard({ beat }: { beat: EndBeat }) {
  const frame = useCurrentFrame();
  const lockup = fade(frame, 0, 18);
  const line = fade(frame, 16, 36);
  return (
    <AbsoluteFill style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            opacity: lockup,
            transform: `translateY(${(1 - lockup) * 16}px)`,
          }}
        >
          <Check progress={1} size={88} color={theme.stamp} />
          <div
            style={{
              fontFamily: serif,
              fontSize: 104,
              fontWeight: 500,
              letterSpacing: "-0.04em",
              color: theme.ink,
            }}
          >
            Tidy
          </div>
        </div>
        <div
          style={{
            fontFamily: serif,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 40,
            color: theme.mute,
            opacity: line,
            transform: `translateY(${(1 - line) * 10}px)`,
          }}
        >
          {beat.line}
        </div>
      </div>
    </AbsoluteFill>
  );
}

export function BeatView({ beat }: { beat: Beat }) {
  switch (beat.kind) {
    case "logo":
      return <LogoBeat />;
    case "feature":
      return <FeatureBeat beat={beat} />;
    case "endcard":
      return <EndCard beat={beat} />;
    default: {
      const neverBeat: never = beat;
      return neverBeat;
    }
  }
}
