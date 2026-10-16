# ADR-001: Render the Tidy film with Remotion

## Status

Accepted

## Date

2026-10-15

## Context

The brief asks for a 12–15 second 1080p MP4 built in code, and names Remotion as the example. The picture has to be reproducible from a command, not assembled in a timeline editor.

## Decision

Use the Remotion 4.0.535 blank template. Register one composition, `Tidy`, at 1920×1080 and 30 fps. Drive every move from `useCurrentFrame()` with `interpolate` and `spring`. Load Fraunces and Outfit through `@remotion/google-fonts` at the matching package version.

The timeline (scene order, frame counts, composition id) lives in `src/edit.ts` with no React import, so the duration contract can be tested without rendering.

## Alternatives considered

- A hand-written canvas or CSS animation exported through ffmpeg. That can make an MP4, but it throws away Remotion's composition model, which is the tool the brief points at.
- Remotion's Hello World template. It ships sample scenes we would delete. The blank template is the smaller start.
- A second agent-skills pack published for Remotion. The setup for this run allows only addyosmani/agent-skills.

## Consequences

Rendering needs Chrome and ffmpeg. The MP4 is a build artifact we commit so the film can be watched without a render. Changing a scene's length means updating `src/edit.ts` and the tests together.
