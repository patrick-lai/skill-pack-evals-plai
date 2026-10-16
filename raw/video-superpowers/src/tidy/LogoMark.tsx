import { spring } from "remotion";
import { COLORS } from "./brand";

const BARS = [
  { width: 70, fromX: 30, fromRot: -8, delay: 0, fill: COLORS.ink },
  { width: 52, fromX: 2, fromRot: 7, delay: 3, fill: COLORS.ink },
  { width: 34, fromX: 32, fromRot: -5, delay: 6, fill: COLORS.celadon },
] as const;

export const LogoMark: React.FC<{
  frame: number;
  fps: number;
  size?: number;
}> = ({ frame, fps, size = 96 }) => {
  return (
    <svg
      width={size}
      height={size * 0.64}
      viewBox="0 0 112 72"
      style={{ overflow: "visible", display: "block" }}
    >
      {BARS.map((bar, index) => {
        const progress = spring({
          frame: Math.max(0, frame - bar.delay),
          fps,
          config: { damping: 14, stiffness: 130, mass: 0.65 },
        });
        const x = bar.fromX + (8 - bar.fromX) * progress;
        const rotation = bar.fromRot * (1 - progress);
        const y = 8 + index * 20;
        return (
          <rect
            key={bar.width}
            x={x}
            y={y}
            width={bar.width}
            height={12}
            rx={6}
            fill={bar.fill}
            transform={`rotate(${rotation} ${x + bar.width / 2} ${y + 6})`}
          />
        );
      })}
    </svg>
  );
};
