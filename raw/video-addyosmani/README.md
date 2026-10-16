# Tidy

A 14-second, 1920×1080 film introducing Tidy, a fictional task app. It opens on the logo, moves through three feature beats — Capture, Today, and Close — and ends on a lockup.

The picture is a Remotion composition. The rendered file is `renders/tidy-intro.mp4`.

## Run

Install Node.js 22 or newer, then:

```bash
npm install
npm test
npm run dev
```

`npm run dev` opens Remotion Studio at [http://localhost:47321](http://localhost:47321).

Render the MP4:

```bash
npm run render
```

That writes `renders/tidy-intro.mp4` (h264, 1920×1080, 14.0 seconds). Check it with:

```bash
ffprobe -hide_banner renders/tidy-intro.mp4
```

`npm run lint` runs ESLint and the TypeScript check.

## Layout

`src/edit.ts` is the timeline. Scenes live in `src/scenes/`. The spec is `SPEC.md`.
