import type { ReactNode } from "react";
import { font } from "../fonts";
import { unit } from "../motion";
import { theme } from "../theme";

type FeatureLayoutProps = {
  frame: number;
  index: string;
  title: string;
  body: string;
  children: ReactNode;
};

export const FeatureLayout = ({
  frame,
  index,
  title,
  body,
  children,
}: FeatureLayoutProps) => {
  const enter = unit(frame, 4, 18);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 128px",
      }}
    >
      <div style={{ width: 520, opacity: enter, transform: `translateY(${(1 - enter) * 24}px)` }}>
        <div
          style={{
            fontFamily: font.sans,
            fontWeight: 500,
            fontSize: 18,
            letterSpacing: "0.24em",
            color: theme.persimmon,
          }}
        >
          {index}
        </div>
        <div
          style={{
            marginTop: 18,
            width: 56,
            height: 3,
            background: theme.persimmon,
            transform: `scaleX(${enter})`,
            transformOrigin: "left center",
          }}
        />
        <h1
          style={{
            margin: "22px 0 0",
            fontFamily: font.display,
            fontWeight: 600,
            fontSize: 104,
            letterSpacing: "-0.035em",
            lineHeight: 0.9,
            color: theme.cream,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            margin: "26px 0 0",
            maxWidth: 440,
            fontFamily: font.sans,
            fontWeight: 400,
            fontSize: 30,
            lineHeight: 1.35,
            color: theme.creamDim,
          }}
        >
          {body}
        </p>
      </div>
      <div style={{ opacity: enter, transform: `translateY(${(1 - enter) * 36}px)` }}>
        {children}
      </div>
    </div>
  );
};
