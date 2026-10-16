# Tidy intro

A 14-second 1080p motion intro for **Tidy**, a fictional task app. The film is a logo reveal, three feature beats (Capture, Arrange, Finish), and an end card. It is built in [Remotion](https://www.remotion.dev/) and rendered to `renders/tidy-intro.mp4`.

## Requirements

- Node.js 22 or newer
- npm
- ffmpeg (used to check the rendered file)
- Chrome, if you want Remotion to use a browser already on the machine. Otherwise Remotion downloads its own.

## Run

```bash
npm install
npm test
npm run typecheck
npm run dev
npm run render
```

`npm run dev` opens Remotion Studio on port **43219**.

`npm run render` writes `renders/tidy-intro.mp4` (H.264, 1920×1080, 30 fps, 14.0 seconds). On this project, `remotion.config.ts` points Remotion at `/usr/bin/google-chrome-stable` or `/usr/bin/google-chrome` when one of those exists.

## Picture

| Passage | What you see |
| --- | --- |
| Logo reveal | The Tidy mark draws on, then the wordmark |
| Capture | A task is typed and kept |
| Arrange | Tasks settle into Today and Later |
| Finish | A task is checked off and the day clears |
| End card | Wordmark, closing line, tidy.app |
