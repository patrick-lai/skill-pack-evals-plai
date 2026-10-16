import type { ReactNode } from "react";
import { font } from "../fonts";
import { theme } from "../theme";

type PaperCardProps = {
  label: string;
  meta: string;
  children: ReactNode;
};

export const PaperCard = ({ label, meta, children }: PaperCardProps) => {
  return (
    <div
      style={{
        width: 860,
        height: 600,
        background: theme.paper,
        borderRadius: 28,
        boxShadow: "0 30px 80px rgba(0, 0, 0, 0.38)",
        padding: "28px 36px 32px",
        display: "flex",
        flexDirection: "column",
        color: theme.ink,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: 99,
              background: theme.persimmon,
            }}
          />
          <span
            style={{
              fontFamily: font.sans,
              fontWeight: 500,
              fontSize: 15,
              letterSpacing: "0.16em",
            }}
          >
            TIDY
          </span>
        </div>
        <span
          style={{
            fontFamily: font.sans,
            fontWeight: 500,
            fontSize: 20,
            color: theme.inkSoft,
          }}
        >
          {label}
          <span style={{ color: theme.inkSoft }}>  ·  </span>
          {meta}
        </span>
      </div>
      <div style={{ position: "relative", flex: 1 }}>{children}</div>
    </div>
  );
};
