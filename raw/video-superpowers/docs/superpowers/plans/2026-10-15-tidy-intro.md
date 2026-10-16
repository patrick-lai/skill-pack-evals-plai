# Tidy Intro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a 14-second 1080p Remotion film that introduces Tidy, plus the rendered MP4 and run instructions.

**Architecture:** Pure modules own brand, timeline, copy, and motion math so tests can pin the spec without rendering. React components only draw those values. One composition, `TidyIntro`, is the render entry.

**Tech Stack:** Remotion 4, React 18, TypeScript, Vitest, Fontsource (Fraunces, Outfit), ffmpeg/ffprobe for the finished file.

**Spec:** `docs/superpowers/specs/2026-10-15-tidy-intro-design.md`

## Global Constraints

- 1920×1080, 30 fps, 420 frames (14.0 seconds), composition id `TidyIntro`.
- Scene order and frame ranges are the spec table: logo 0–90, capture 90–174, place 174–258, close 258–336, end 336–420.
- On-screen copy is the spec table, character for character.
- The task string `Call the dentist` is the capture line, the placed card, and the first close row.
- Palette hex values are the spec's builder-call palette.
- Output file `renders/tidy-intro.mp4`, H.264, no audio.
- Fonts are vendored in `public/fonts/` from Fontsource (OFL). No Google Fonts fetch at render time.
- Silent film. No extra product surfaces, auth, or backend.

## Review Focus

- A frame outside `0..419` must throw from `sceneAtFrame`, not wrap or return the end card — pinned in Task 1.
- Every frame `0..419` belongs to exactly one beat, and the last frame is `end` — pinned in Task 1.
- `Call the dentist` stays the same string across capture, place, and the first close row — pinned in Task 1.
- The rendered file is 1920×1080 H.264 and its duration is between 12 and 15 seconds — pinned in Task 3.
- Vendored font files exist before render, so a missing font cannot silently fall back — pinned in Task 2. Stills still have to be looked at, because a present file can fail to apply.

---

### Task 1: Timeline and motion contract

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/tidy/brand.ts`
- Create: `src/tidy/timeline.ts`
- Create: `src/tidy/motion.ts`
- Test: `tests/timeline.test.ts`
- Test: `tests/motion.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `COLORS` record of brand hex strings
  - `COMPOSITION` with `id`, `width`, `height`, `fps`, `durationInFrames`
  - `BEATS` readonly array of `{ id, start, end }`
  - `beatById(id: BeatId): Beat`
  - `sceneAtFrame(frame: number): BeatId`
  - `featureById(id: "capture" | "place" | "close"): Feature`
  - `CAPTURE`, `PLACE`, `CLOSE_ROWS` demo constants
  - `entrance(localFrame: number, duration?: number): { opacity: number; offsetY: number }`
  - `typedText(full: string, localFrame: number, startFrame: number, framesPerChar: number): string`
  - `captureChipVisible(localFrame: number): boolean`
  - `placeProgress(localFrame: number, moveStart: number, moveDuration: number): number`
  - `closeRowState(localFrame: number, kind: "check" | "tomorrow" | "resting"): { checked: number; moved: number }`
  - `logoWordmarkOpacity(localFrame: number): number`
  - `endLineOpacity(localFrame: number, delay: number): number`

- [ ] **Step 1: Write the failing tests**

`tests/timeline.test.ts` asserts composition size, 420 frames, beat coverage with no gaps or overlaps, `sceneAtFrame` boundaries, a throw on frame 420 and frame -1, exact feature copy, brand hex `#EFE7DA` / `#1C1712` / `#1E6B52` / `#A65B3C`, and `CAPTURE.text === PLACE.text === CLOSE_ROWS[0].text === "Call the dentist"`.

`tests/motion.test.ts` asserts `typedText("Call the dentist", 18, 18, 2)` is `"C"`, `typedText(..., 17, 18, 2)` is `""`, the full string once typing finishes, `captureChipVisible(55)` is false and `captureChipVisible(56)` is true, `placeProgress` is 0 before the move and 1 after it, `closeRowState` resting is already checked, check kind is 0 at frame 13 and 1 at frame 30, tomorrow kind moves from 0 at frame 31 to 1 at frame 48, `entrance(0).opacity` is 0.35, `logoWordmarkOpacity(22)` is 0 and `logoWordmarkOpacity(36)` is 1, `endLineOpacity(0, 0)` is 1.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/timeline.test.ts tests/motion.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement the modules**

Put the spec values in `brand.ts`, `timeline.ts`, and `motion.ts`. `sceneAtFrame` throws `Error` when the frame is outside `0..durationInFrames-1`. `placeProgress` uses an ease-out cubic. `endLineOpacity(localFrame, 0)` stays 1 so the end-card mark is present on the cut.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/timeline.test.ts tests/motion.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts src/tidy tests
git commit -m "feat: pin Tidy timeline, copy, and motion math"
```

### Task 2: Remotion composition

**Files:**
- Create: `remotion.config.ts`
- Create: `src/index.ts`
- Create: `src/Root.tsx`
- Create: `src/TidyIntro.tsx`
- Create: `src/tidy/fonts.tsx`
- Create: `src/tidy/LogoMark.tsx`
- Create: `src/tidy/LogoReveal.tsx`
- Create: `src/tidy/FeatureStage.tsx`
- Create: `src/tidy/FeatureCapture.tsx`
- Create: `src/tidy/FeaturePlace.tsx`
- Create: `src/tidy/FeatureClose.tsx`
- Create: `src/tidy/EndCard.tsx`
- Create: `public/fonts/*` vendored woff2 plus Fontsource license files
- Modify: `package.json` scripts and dependencies
- Test: `tests/fonts.test.ts`
- Test: `tests/wiring.test.ts`

**Interfaces:**
- Consumes: Task 1 exports
- Produces: Remotion root registering `TidyIntro` at `COMPOSITION` dimensions. `npm run dev` starts Studio on port 43219. `npm run still` writes a single frame.

- [ ] **Step 1: Write the failing tests**

`tests/fonts.test.ts` asserts these files exist: `public/fonts/fraunces-latin-full-normal.woff2`, `public/fonts/fraunces-latin-full-italic.woff2`, `public/fonts/outfit-latin-wght-normal.woff2`.

`tests/wiring.test.ts` reads the component sources and asserts `FeatureCapture.tsx` contains `featureById("capture")`, `FeaturePlace.tsx` contains `featureById("place")`, `FeatureClose.tsx` contains `featureById("close")`, and `Root.tsx` passes `COMPOSITION.width`, `COMPOSITION.height`, `COMPOSITION.fps`, and `COMPOSITION.durationInFrames` into the composition.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/fonts.test.ts tests/wiring.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement the film**

Install `remotion`, `@remotion/cli`, `react`, `react-dom`, `@fontsource/fraunces`, `@fontsource/outfit`. Copy the variable fonts into `public/fonts/`. Load them with `FontFace` and `delayRender` / `continueRender`. Components read copy and timing only from Task 1. Paper background is continuous. Scenes hard-cut using `sceneAtFrame` / beat ranges. Logo bars spring from a scattered pose into the stack. Feature sheets show the demo states from the motion helpers. End card shows wordmark, line, and `tidy.app`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 5: Render stills and look at them**

Run stills at frames 12, 70, 140, 220, 300, and 390. Adjust spacing only if type collides or a headline leaves the safe area. Do not change spec copy or frame ranges.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json remotion.config.ts src public tests
git commit -m "feat: compose the Tidy intro in Remotion"
```

### Task 3: Render, verify, and document

**Files:**
- Create: `scripts/verify-mp4.mjs`
- Create: `README.md`
- Create: `run-log.md`
- Create: `renders/tidy-intro.mp4`
- Modify: `package.json` scripts `render` and `verify`

**Interfaces:**
- Consumes: composition `TidyIntro`
- Produces: `renders/tidy-intro.mp4` and a passing `npm run verify`

- [ ] **Step 1: Write the failing verifier**

`scripts/verify-mp4.mjs` runs ffprobe on `renders/tidy-intro.mp4` and exits non-zero unless the video stream is h264, 1920×1080, and duration is greater than or equal to 12 and less than or equal to 15.05. It also fails if an audio stream is present.

- [ ] **Step 2: Run the verifier to see it fail**

Run: `node scripts/verify-mp4.mjs`
Expected: FAIL because the MP4 does not exist yet.

- [ ] **Step 3: Render**

Run: `npx remotion render src/index.ts TidyIntro renders/tidy-intro.mp4 --codec=h264 --crf=16`

- [ ] **Step 4: Run the verifier**

Run: `node scripts/verify-mp4.mjs`
Expected: PASS, printing width, height, codec, and duration.

- [ ] **Step 5: README and run log**

Replace the seeded README with what this repo is and how to install, test, preview, and render. Write `run-log.md` with pack name, source URL, commit SHA, model, verbatim task prompt, start and end UTC, and tokens.

- [ ] **Step 6: Commit**

```bash
git add scripts package.json README.md run-log.md renders/tidy-intro.mp4
git commit -m "feat: render the Tidy intro MP4"
```
