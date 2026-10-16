import { font } from "../fonts";
import { theme } from "../theme";

type TaskRowProps = {
  title: string;
  time?: string;
  check?: number;
  strike?: number;
  dim?: number;
};

export const TaskRow = ({
  title,
  time,
  check = 0,
  strike = 0,
  dim = 0,
}: TaskRowProps) => {
  return (
    <div
      style={{
        height: 72,
        display: "flex",
        alignItems: "center",
        gap: 18,
        borderBottom: `1px solid ${theme.line}`,
        opacity: 1 - dim * 0.35,
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 99,
          border: `2px solid ${check > 0.5 ? theme.persimmon : theme.ink}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 auto",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M2 7.2 L5.4 10.6 L12 3.4"
            stroke={theme.persimmon}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="16"
            strokeDashoffset={16 * (1 - check)}
          />
        </svg>
      </div>
      <div style={{ position: "relative", flex: 1 }}>
        <span
          style={{
            fontFamily: font.sans,
            fontWeight: 500,
            fontSize: 26,
            color: theme.ink,
          }}
        >
          {title}
        </span>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 28,
            top: "52%",
            height: 2,
            background: theme.ink,
            transform: `scaleX(${strike})`,
            transformOrigin: "left center",
          }}
        />
      </div>
      {time ? (
        <span
          style={{
            fontFamily: font.sans,
            fontWeight: 500,
            fontSize: 20,
            color: theme.inkSoft,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {time}
        </span>
      ) : null}
    </div>
  );
};
