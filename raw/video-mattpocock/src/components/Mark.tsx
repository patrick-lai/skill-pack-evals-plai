import { color } from "../theme";

export function Mark({
  size,
  progress = 1,
}: {
  size: number;
  progress?: number;
}) {
  const drawn = Math.min(1, Math.max(0, progress));

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <rect width="64" height="64" rx="16" fill={color.ink} />
      <path
        d="M18 33.5 L28.2 43.2 L47 22"
        stroke={color.paper}
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        strokeDasharray={100}
        strokeDashoffset={100 - drawn * 100}
      />
    </svg>
  );
}
