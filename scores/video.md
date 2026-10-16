# Video — blind scores (A-D), source + 6 frames each

Craft is from playback (motion review) blended with stills.

ffprobe: A 1920x1080 30fps 14.0s h264; B 1920x1080 30fps 14.0s h264; C 1920x1080 30fps 14.6s h264; D 1920x1080 30fps 14.0s h264. All silent, all in spec. Frames: /workspace/bench/scores/frames/<label>/ (sheet.png = contact sheet).

| Label | Correctness | Code quality | Scope discipline | Verification | Craft | Total |
|---|---|---|---|---|---|---|
| A | 5: logo, Capture/Arrange/Finish beats, end card with tagline + "tidy.app" all present | 4: scenes/components split, ~1k lines, tidy | 5: just the film + tests | 4: vitest `introFilm.test.ts` + `deliverable.test.ts`, typecheck script | 3: clean layout, but typo "Cel" typed at 0:03, hard cut to a full list at 0:06, logo flashes as an unstyled grey box at 0:11 | 21 |
| B | 5: logo, Capture/Place/Close, end card with URL pill | 5: timeline + motion math split out, vendored fonts with licences | 4: committed `stills/` (14 PNGs) is repo clutter | 5: four test files + `npm run verify` checks 1080p/H.264/12-15s | 3: strong story and type in stills, but motion is stiff and linear: drag at 0:06 has no easing or shadow, "Tomorrow" badge cramped at 0:10 | 22 |
| C | 5: logo, three beats, end card; 14.6s in range | 4: compact (713 lines), single timeline drives duration | 5: minimal | 4: node test on timeline + `npm run check` ffprobe gate | 2: "Nothing waiting." renders on top of the struck-through "Book the 4pm train" at 0:11; sparse end card with no URL | 20 |
| D | 5: logo, three beats, end card all present (SPEC.md was removed during anonymising, so it is not penalised) | 4: scenes/components clean, eslint+prettier | 4: extra `build`/`upgrade` scripts, boilerplate config comments | 3: one timeline test; MP4 check left as a manual `ffprobe` instruction | 5: no glitches on playback; scattered notes snap into a list at 0:03-0:04 with clean easing | 21 |

**Strongest: B (22).** Best engineering and self-checking: "`npm run verify` checks that the file is 1080p H.264 and between 12 and 15 seconds", plus one task carried through all three beats. Its motion is stiff, though, and A trails by one point.

**Weakest: C (20).** Its defect is in the delivered MP4: "Nothing waiting." collides with the fading "Book the 4pm train" at 0:11, and its end card is sparse. D (21) is the best-looking video by a clear margin, but it is held back by a manual-only render check ("Check it with: ffprobe -hide_banner renders/tidy-intro.mp4") and a single timeline test.
