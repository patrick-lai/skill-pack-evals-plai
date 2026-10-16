# Plan: Tidy intro film

## Dependency graph

```
timeline contract (src/edit.ts)
    │
    ├── unit tests (tests/edit.test.mts)
    │
    └── Remotion composition
            │
            ├── theme, fonts, mark
            │
            ├── five scenes (logo, capture, today, close, end)
            │
            └── TidyFilm camera
                    │
                    └── h264 render → ffprobe + stills
```

Build the contract first so duration and scene order are locked before any picture work. Scenes depend on the contract and the theme, not on each other. The render depends on every scene.

## Order

1. Scaffold the Remotion 4.0.535 blank template and add `@remotion/google-fonts`.
2. Land the timeline contract and a failing-then-passing test.
3. Build the shared desk, mark, and camera so a placeholder film already renders at 1920×1080.
4. Replace placeholders one scene at a time: logo, then the three features, then the end card.
5. Render stills, correct spacing and timing, then render the MP4 and probe it.

## Risks

- **Chrome sandbox or a missing browser.** Mitigation: fall back to the system Chrome binary at `/usr/bin/google-chrome-stable` if Remotion's downloaded browser fails.
- **Google font fetch during render.** Mitigation: load only Fraunces 500/600 and Outfit 400/500, latin subset, per the font-loading docs. If the fetch fails, switch to the installed Inter and Noto Serif faces.
- **Slide transition unmounts the outgoing scene.** Mitigation: keep every panel mounted and clamp each scene to its last frame while the camera moves on.

## Parallel vs sequential

Scenes can be written independently once the contract, theme, and `FeatureLayout` exist. The render cannot start until all five scenes are in the tree.

## Verification checkpoints

- After the contract: `npm test` passes and the composition id, size, and 14.0s duration match the spec.
- After the first full composition: `npm run lint` passes.
- After stills look right: `npm run render`, then `ffprobe` confirms h264, 1920×1080, and a duration from 12 to 15 seconds.
