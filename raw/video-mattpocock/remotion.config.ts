import { existsSync } from "fs";
import { Config } from "@remotion/cli/config";

Config.setOverwriteOutput(true);

const chrome = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome"].find((path) =>
  existsSync(path),
);

if (chrome) {
  Config.setBrowserExecutable(chrome);
}
