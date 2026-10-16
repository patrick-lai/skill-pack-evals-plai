// Load only the weights this film uses.
// https://www.remotion.dev/docs/google-fonts/load-font
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadOutfit } from "@remotion/google-fonts/Outfit";

const fraunces = loadFraunces("normal", {
  weights: ["500", "600"],
  subsets: ["latin"],
});

loadFraunces("italic", {
  weights: ["500"],
  subsets: ["latin"],
});

const outfit = loadOutfit("normal", {
  weights: ["400", "500"],
  subsets: ["latin"],
});

export const font = {
  display: fraunces.fontFamily,
  sans: outfit.fontFamily,
};
