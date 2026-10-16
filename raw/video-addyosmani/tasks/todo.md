# Tasks: Tidy intro film

## Task 1: Timeline contract

**Description:** Encode composition id, 1920×1080, 30 fps, and the five contiguous scenes in `src/edit.ts`.

**Acceptance criteria:**
- [x] Duration is exactly 14.0 seconds
- [x] Scene order is logo, capture, today, close, end
- [x] Exactly three scenes have kind `feature`
- [x] Scenes tile the timeline from frame 0 with no gaps

**Verification:**
- [x] Tests pass: `npm test`
- [x] Build succeeds: `npm run lint`
- [x] Manual check: scene starts sum to 420 frames

**Dependencies:** None

**Files likely touched:**
- `src/edit.ts`
- `tests/edit.test.mts`
- `package.json`

**Estimated scope:** Small: 1-2 files

## Task 2: Logo reveal

**Description:** Draw the mark, the wordmark, and the tagline on the opening panel.

**Acceptance criteria:**
- [x] Mark and the word "Tidy" are readable by the end of the logo scene
- [x] Motion comes from the current frame via `spring` and `interpolate`

**Verification:**
- [x] Tests pass: `npm test`
- [x] Build succeeds: `npm run lint`
- [x] Manual check: still at the logo hold shows the lockup

**Dependencies:** Task 1

**Files likely touched:**
- `src/theme.ts`
- `src/fonts.ts`
- `src/components/TidyMark.tsx`
- `src/scenes/LogoScene.tsx`
- `src/TidyFilm.tsx`
- `src/Root.tsx`

**Estimated scope:** Medium: 3-5 files

## Task 3: Three feature beats

**Description:** Capture snaps scraps into an inbox, Today drops what does not fit, Close checks items off and clears the desk.

**Acceptance criteria:**
- [x] Each feature shows its claim and an animated paper card
- [x] The three claims match the spec

**Verification:**
- [x] Tests pass: `npm test`
- [x] Build succeeds: `npm run lint`
- [x] Manual check: one still per feature shows the settled state

**Dependencies:** Task 2

**Files likely touched:**
- `src/scenes/CaptureScene.tsx`
- `src/scenes/TodayScene.tsx`
- `src/scenes/CloseScene.tsx`
- `src/components/FeatureLayout.tsx`
- `src/components/PaperCard.tsx`

**Estimated scope:** Medium: 3-5 files

## Task 4: End card and render

**Description:** Hold the end lockup, render `renders/tidy-intro.mp4`, and prove the file.

**Acceptance criteria:**
- [x] End card shows the mark, "Tidy", the tagline, and tidy.app
- [x] ffprobe reports h264, 1920×1080, and duration between 12 and 15 seconds

**Verification:**
- [x] Tests pass: `npm test`
- [x] Build succeeds: `npm run lint`
- [x] Manual check: `ffprobe -hide_banner renders/tidy-intro.mp4` and stills from the file

**Dependencies:** Task 3

**Files likely touched:**
- `src/scenes/EndScene.tsx`
- `package.json`
- `README.md`
- `renders/tidy-intro.mp4`

**Estimated scope:** Medium: 3-5 files

## Checkpoint: After Tasks 1-4

- [x] All tests pass
- [x] Lint and typecheck pass
- [x] Rendered MP4 matches the success criteria in SPEC.md
- [x] README documents install, studio, and render
- [x] run-log.md is filled in
