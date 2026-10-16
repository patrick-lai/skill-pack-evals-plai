import type { ReactNode } from "react";
import { Mark } from "./Mark";
import { color, font } from "../theme";

export function AppSheet({
  meta,
  children,
}: {
  meta: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: 760,
        height: 660,
        borderRadius: 32,
        backgroundColor: color.card,
        border: "1px solid rgba(28, 24, 20, 0.06)",
        boxShadow: "0 28px 70px rgba(28, 24, 20, 0.12)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 76,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 26px",
          borderBottom: `1px solid ${color.line}`,
        }}
      >
        <Mark size={30} />
        <span
          style={{
            fontFamily: font.serif,
            fontSize: 28,
            color: color.ink,
            lineHeight: 1,
          }}
        >
          Tidy
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: font.sans,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: color.muted,
          }}
        >
          {meta}
        </span>
      </div>
      <div style={{ flex: 1, padding: 28, position: "relative" }}>{children}</div>
    </div>
  );
}
