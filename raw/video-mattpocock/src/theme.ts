import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadSans } from "@remotion/google-fonts/Outfit";

const serif = loadSerif("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

loadSerif("italic", {
  weights: ["400"],
  subsets: ["latin"],
});

const sans = loadSans("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

export const font = {
  serif: serif.fontFamily,
  sans: sans.fontFamily,
};

export const color = {
  paper: "#EFE6D6",
  ink: "#1C1814",
  muted: "#6E645B",
  line: "#E3D4C2",
  card: "#FBF7F1",
  sienna: "#C24D2A",
  leaf: "#24563F",
  white: "#FFFCF8",
};
