import { theme } from "../theme";

const BOX = 248;
const CHECK = 48;

type TidyMarkProps = {
  size: number;
  box: number;
  check: number;
  stroke?: string;
  accent?: string;
};

export const TidyMark = ({
  size,
  box,
  check,
  stroke = theme.cream,
  accent = theme.persimmon,
}: TidyMarkProps) => {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <rect
        x="6"
        y="6"
        width="68"
        height="68"
        rx="18"
        stroke={stroke}
        strokeWidth="3.25"
        strokeDasharray={BOX}
        strokeDashoffset={BOX * (1 - box)}
      />
      <path
        d="M24 42.5 L35 53.5 L57 28"
        stroke={accent}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={CHECK}
        strokeDashoffset={CHECK * (1 - check)}
      />
    </svg>
  );
};
