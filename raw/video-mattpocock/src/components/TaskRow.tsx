import { color, font } from "../theme";

export function TaskRow({
  label,
  checked = 0,
  strike = 0,
  dim = false,
}: {
  label: string;
  checked?: number;
  strike?: number;
  dim?: boolean;
}) {
  const fill = Math.min(1, Math.max(0, checked));

  return (
    <div
      style={{
        height: 72,
        borderRadius: 18,
        backgroundColor: color.white,
        border: `1px solid ${color.line}`,
        display: "flex",
        alignItems: "center",
        padding: "0 18px",
        gap: 14,
        opacity: dim ? 0.42 : 1,
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          boxSizing: "border-box",
          border: `2px solid ${fill > 0.5 ? color.leaf : color.ink}`,
          backgroundColor: `rgba(36, 86, 63, ${fill})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 8.2 L6.4 11.5 L13 4.5"
            stroke={color.white}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={fill}
          />
        </svg>
      </div>
      <span
        style={{
          position: "relative",
          fontFamily: font.sans,
          fontSize: 22,
          fontWeight: 500,
          color: color.ink,
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {label}
        <span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "54%",
            height: 2,
            backgroundColor: color.muted,
            transform: `scaleX(${Math.min(1, Math.max(0, strike))})`,
            transformOrigin: "left center",
          }}
        />
      </span>
    </div>
  );
}
