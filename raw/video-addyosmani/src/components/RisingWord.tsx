import { settle } from "../motion";

type RisingWordProps = {
  text: string;
  frame: number;
  fps: number;
  delay: number;
  fontFamily: string;
  fontSize: number;
  color: string;
  weight?: number;
  italic?: boolean;
  tracking?: number;
};

export const RisingWord = ({
  text,
  frame,
  fps,
  delay,
  fontFamily,
  fontSize,
  color,
  weight = 600,
  italic = false,
  tracking = -0.03,
}: RisingWordProps) => {
  return (
    <div
      style={{
        display: "flex",
        fontFamily,
        fontWeight: weight,
        fontStyle: italic ? "italic" : "normal",
        fontSize,
        color,
        letterSpacing: `${tracking}em`,
        lineHeight: 0.92,
      }}
    >
      {Array.from(text).map((char, index) => {
        const progress = settle(frame, fps, delay + index * 3);
        return (
          <span
            key={`${char}-${index}`}
            style={{
              display: "inline-block",
              opacity: progress,
              transform: `translateY(${(1 - progress) * 28}px)`,
              whiteSpace: "pre",
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};
