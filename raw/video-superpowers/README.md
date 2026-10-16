# Tidy intro

A 14-second, 1080p film for **Tidy**, a fictional task app. The picture is built in [Remotion](https://www.remotion.dev/): a logo reveal, three feature beats, and an end card.

The story follows one task. "Call the dentist" is captured in a single line, placed in the afternoon, and closed at the end of the day.

## What plays

| Time | Scene |
| --- | --- |
| 0:00–0:03 | Logo. Three bars tidy themselves, then the wordmark. |
| 0:03–0:05.8 | Capture. The line is typed and kept. |
| 0:05.8–0:08.6 | Place. The same task settles into Afternoon. |
| 0:08.6–0:11.2 | Close. It is done. Another task moves to tomorrow. |
| 0:11.2–0:14 | End card. Tidy, "The calm task list.", tidy.app |

The rendered file is `renders/tidy-intro.mp4`: 1920×1080, 30 fps, 420 frames, H.264, silent.

## Run it

Node 18 or newer.

```bash
npm install
npm test
npm run render
npm run verify
```

`npm run render` writes `renders/tidy-intro.mp4`. `npm run verify` checks that the file is 1080p H.264 and between 12 and 15 seconds.

Preview in Remotion Studio:

```bash
npm run dev
```

Studio listens on port 43219. A single frame:

```bash
npx remotion still src/index.ts TidyIntro stills/frame.png --frame=70
```

## Layout

- `src/TidyIntro.tsx` is the composition.
- `src/tidy/timeline.ts` holds the frame map and the on-screen copy.
- `src/tidy/motion.ts` holds the motion math the tests pin.
- `public/fonts/` vendors Fraunces and Outfit (SIL Open Font License; see the license files beside the fonts).

Chrome is required to render. The project points Remotion at `google-chrome-stable` when that binary is present on the machine running the config in `remotion.config.ts`.
