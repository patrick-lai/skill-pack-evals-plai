# Tidy intro — design

## Intent

Tidy is a fictional task app for people who want their day to look finished, not managed. This film is a 14-second product intro: a logo that tidies itself, three feature beats that follow one task through a day, and an end card. It should feel like a short editorial spot on warm paper, not a SaaS dashboard and not a template motion graphic.

The task prompt fixed the deliverable. This session cannot wait for a second design round. Visual and copy choices below are builder calls, marked as such. Scope from the prompt (length, resolution, structure, name, code-built MP4 plus source and run instructions) is treated as already approved.

## Goals

- A 1920×1080 H.264 MP4, 30 fps, exactly 420 frames (14.0 seconds), silent.
- Five scenes in order: logo reveal, three feature beats, end card.
- One continuous story: the task "Call the dentist" is captured, placed in the afternoon, then closed.
- Full Remotion source and a README that says how to test, preview, and render.

## Non-goals

- A real product, website, account system, or backend.
- Voiceover, music, or sound effects.
- More than three features, or a tour of settings, collaboration, or notifications.

## Anti-goals

- Purple gradients, glassmorphism, or a generic productivity UI.
- Lorem, placeholder headlines, or a second fictional product name.
- A film shorter than 12 seconds or longer than 15 seconds.

## What the prompt decided

- Fictional task app named Tidy.
- Structure: logo reveal, three feature beats, end card.
- 12–15 seconds, 1080p, built in code (Remotion), MP4 plus source and run instructions.

## Builder calls

- **Medium:** Remotion 4, React, TypeScript. Official `create-video` is interactive, so the project is a hand-written Remotion entry using the official packages.
- **Length:** 14.0 seconds (420 frames at 30 fps), inside the 12–15 second window with room for encoder rounding.
- **Palette:** warm paper `#EFE7DA`, raised sheet `#F7F1E7`, ink `#1C1712`, soft ink `#5E564C`, celadon `#1E6B52`, celadon wash `#D7E8DE`, clay `#A65B3C`, clay wash `#F3E2D6`.
- **Type:** Fraunces (display, variable) and Outfit (UI, variable), vendored from Fontsource under the SIL Open Font License.
- **Story and copy,** exact strings:

| Scene | On-screen copy |
| --- | --- |
| Logo | Wordmark `Tidy`. Line `A calmer list.` |
| Capture | Index `01`, name `Capture`, title `Catch it in one line.`, body `No project. No due date. Just the thought.` Demo line `Call the dentist`. Chip `Kept`. Sheet label `Inbox`. |
| Place | Index `02`, name `Place`, title `Put it where the day can hold it.`, body `Morning, afternoon, or evening. Not a pile.` Lanes `Morning`, `Afternoon`, `Evening`. The same task settles in `Afternoon`. |
| Close | Index `03`, name `Close`, title `Close the day on purpose.`, body `Done, or moved to tomorrow. Nothing left hovering.` Rows: `Call the dentist` checks off, `Reply to Mara` moves to `Tomorrow`, `Water the fern` is already done. |
| End | Wordmark `Tidy`. Line `The calm task list.` URL `tidy.app`. |

- **Timing (frames, start inclusive, end exclusive):**

| Id | Start | End | Seconds |
| --- | --- | --- | --- |
| logo | 0 | 90 | 3.0 |
| capture | 90 | 174 | 2.8 |
| place | 174 | 258 | 2.8 |
| close | 258 | 336 | 2.6 |
| end | 336 | 420 | 2.8 |

- **Motion:** hard cuts between scenes on a continuous paper field, so dissimilar layouts do not crossfade into mud. Logo bars are visible on frame 0 in a scattered state and spring into a tidy stack; the wordmark follows. Feature scenes enter already partly visible and ease up a few pixels. The end card cuts on with the mark present and the lines staggering in. A 4px celadon progress hairline runs along the bottom for the whole film.
- **Logo mark:** three left-aligned rounded bars. The shortest bar is celadon (the one that is done). The other two are ink.
- **Output:** `renders/tidy-intro.mp4`, H.264, composition id `TidyIntro`. A copy is also saved as a run artifact.
- **Silence:** no audio track.

## How a frame should feel

Paper fills the frame. Nothing important sits against the edges; content lives inside about 120px of margin. Feature beats are a two-column spread: a large Fraunces headline on the left, a raised sheet on the right that behaves like the app. The sheet has a small Tidy mark, a label, and one idea animating inside it. The end card is centered and quiet.

## Constraints

- Node project, reproducible with `npm install`, `npm test`, `npm run render`.
- Fonts are files in the repo, not a runtime fetch from Google.
- Tests own the timing, copy, brand colors, scene coverage, and the continuity of "Call the dentist". Picture quality is checked by rendering stills and the MP4.

## Builder check

Author pass for this autonomous session: nothing important is left open. A wrong guess about palette, copy, or timing would change the film, and those are written down above as builder calls rather than questions. Font sizes may be tuned after stills if a headline wraps badly; the copy and the frame map may not change without updating this document.
