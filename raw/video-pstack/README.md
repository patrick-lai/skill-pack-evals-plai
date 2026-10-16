# Render the Tidy intro

Tidy is a fictional task app. This repository is the source for a 14.6 second, 1080p film that introduces it.

The film plays a logo, three feature beats, and an end card.

## Render

Install dependencies, then render.

```bash
npm install
npm test
npm run render
```

`npm run render` writes `renders/tidy-intro.mp4`.

`npm run check` reads that file with ffprobe. It fails unless the picture is 1920x1080, the codec is H.264, and the duration is from 12 to 15 seconds.

## Preview

```bash
npm run studio
```

Studio listens on port 43123.

## Change the film

Beat order, copy, and length live in `src/timeline.ts`. The composition duration is the sum of those lengths. Keep that sum from 12 to 15 seconds at 30 frames per second.
