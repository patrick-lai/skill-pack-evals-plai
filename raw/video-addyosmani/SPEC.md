# Spec: Tidy intro film

## Objective

Produce a 12–15 second, 1920×1080 MP4 that introduces Tidy, a fictional task app. The film is a brand piece, not a product demo of a working app.

Audience: someone seeing the name for the first time.

Success looks like a single rendered file a person can play, plus source that renders that same file again from the command line.

### Beats

1. **Logo reveal** — the Tidy mark and wordmark appear, with the line "Put the day away."
2. **Capture** — a loose thought becomes one inbox item. Claim: "A thought lands. Tidy files it."
3. **Today** — a crowded list collapses to what fits the day. Claim: "The day holds only what fits."
4. **Close** — finished tasks leave the desk. Claim: "Finished work leaves the desk."
5. **End card** — mark, wordmark, "The task app for a clear desk.", and `tidy.app`.

The three middle beats are the three features. The end card is a lockup, not a fourth feature.

## Assumptions

The task prompt is the approved brief. This is an autonomous background run, so the spec-driven review gate cannot pause the turn. These assumptions are the ones that brief left open:

1. One composition, landscape, 30 fps, exactly 14.0 seconds (420 frames). That sits inside 12–15 seconds.
2. Remotion blank template, TypeScript. No Tailwind. Do not install the Remotion agent-skills pack; this run loads only addyosmani/agent-skills.
3. Silent picture. No music or voiceover was requested.
4. The three features are Capture, Today, and Close, in that order.
5. Visual system is a warm walnut desk and cream paper, with one persimmon accent. Not a purple gradient.
6. Phase 0 capability map is skipped. This request is one film, not several independently shippable modules.
7. The deliverable MP4 is committed at `renders/tidy-intro.mp4` and copied to the artifacts store.

## Tech Stack

- Remotion 4.0.535 (`remotion`, `@remotion/cli`) and React 19.2.3, from `create-video@latest --yes --blank`
- `@remotion/google-fonts` 4.0.535 for Fraunces and Outfit
- React and TypeScript, as shipped by the blank template
- `@remotion/google-fonts` for Fraunces (wordmark) and Outfit (UI)
- Node.js test runner (`node --experimental-strip-types --test`) for the timeline contract
- ffmpeg for probing the rendered file

Sources for framework patterns:

- Composition: https://www.remotion.dev/docs/composition
- Fundamentals (`useCurrentFrame`, `useVideoConfig`, `AbsoluteFill`): https://www.remotion.dev/docs/the-fundamentals
- Sequence timing: https://www.remotion.dev/docs/sequence
- `interpolate` / easing, driven by the frame: https://www.remotion.dev/docs/animating-properties
- `spring`: https://www.remotion.dev/docs/spring
- Fonts: https://www.remotion.dev/docs/fonts and https://www.remotion.dev/docs/google-fonts/load-font
- Render: https://www.remotion.dev/docs/cli/render

## Commands

```
npm install
npm test
npm run typecheck
npm run dev
npm run render
ffprobe -hide_banner renders/tidy-intro.mp4
```

`npm run dev` starts Remotion Studio on port 47321.
`npm run render` writes `renders/tidy-intro.mp4` with the h264 codec.

## Project Structure

```
src/edit.ts            Timeline contract (fps, size, scene list). No React.
src/theme.ts           Color and type tokens.
src/fonts.ts           Google font loaders.
src/Root.tsx           Composition registration.
src/TidyFilm.tsx       Root composition.
src/scenes/            Logo, feature, and end-card scenes.
src/components/        Mark, paper card, shared motion.
tests/edit.test.ts     Timeline contract tests.
renders/tidy-intro.mp4 Rendered deliverable.
docs/decisions/        ADRs.
tasks/plan.md          Implementation plan.
tasks/todo.md          Task list.
SPEC.md                This spec.
run-log.md             Run record required by the task setup.
```

## Code Style

Timeline data stays free of React so the test runner can import it. Scene components read `useCurrentFrame()` and do not use CSS transitions or animations. Colors come from `theme.ts`.

```tsx
const enter = interpolate(frame, [0, 14], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
  easing: Easing.bezier(0.16, 1, 0.3, 1),
});
```

Naming: scene ids are `logo`, `capture`, `today`, `close`, `end`. Composition id is `Tidy`.

## Testing Strategy

- Unit: `tests/edit.test.ts` locks duration, resolution, fps, scene order, contiguity, and the three-feature count. It must fail before `src/edit.ts` exists and pass after.
- Render proof: `ffprobe` confirms an h264 stream, 1920×1080, and a duration between 12 and 15 seconds.
- Visual proof: stills extracted from the rendered file at the logo, each feature, and the end card.

No browser e2e. The product is a file, not a click-through app.

## Boundaries

- Always: drive motion from the current frame; keep the timeline in `src/edit.ts`; run `npm test` before calling the film done; commit the rendered MP4.
- Ask first: adding a soundtrack, changing the three feature claims, or switching away from Remotion.
- Never: install another agent skill pack; commit secrets; use CSS animations for motion; claim a duration the probe did not measure.

## Success Criteria

- `renders/tidy-intro.mp4` exists, plays, and `ffprobe` reports width 1920, height 1080, codec h264, and duration in the closed range 12–15 seconds.
- The picture contains a logo reveal, exactly three feature beats (Capture, Today, Close), and an end card.
- `npm test` passes.
- README states the install, preview, and render commands.
- `run-log.md` records the skill pack name, source URL, commit SHA, model, verbatim task prompt, start and end timestamps in UTC, and tokens.

## Open Questions

None that block the brief. Soundtrack, alternate feature names, and a portrait cut were not requested and are out of scope.
