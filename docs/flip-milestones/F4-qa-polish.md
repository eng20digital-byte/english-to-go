# F4 — Cross-direction QA & polish

## Goal
Confirm the rewritten flip is correct and feels finished across directions,
inputs, edges, and accessibility settings; tune depth/shadow only if needed.

## Scope
- Full manual QA pass (below). No structural changes expected.
- Optional, only if visually warranted: tune `PAGE_FLIP_PERSPECTIVE_PX`,
  `PAGE_FLIP_SHADOW_MAX_OPACITY`, `PAGE_FLIP_DURATION_MS`, or `PAGE_FLIP_EASING`
  in [src/config/reader.ts](../../src/config/reader.ts). Adjust the constants
  only — never hardcode values into the component (CLAUDE.md "no magic numbers").

## Out of scope
- New features; any renderer changes.

## Manual verification
1. **Next** (right arrow / `ArrowRight` / swipe-left): right half folds left
   around the spine; arriving left half appears on the leaf back at ~90° and the
   new right half is revealed underneath; lands as a coherent next canvas, no
   flash/jump.
2. **Prev** (left arrow / `ArrowLeft` / swipe-right): clean mirror — no jump at
   start (left) or end (right).
3. Mid-flip freeze (DevTools): true 3D depth/perspective, not a flat slide.
4. Edges: prev disabled / no-op on page 1; next disabled / no-op on the last
   page; no flip fires past the ends.
5. Rapid input: spam next/prev and alternate quickly — no stuck leaf, no wrong
   page, index stays consistent (guarded by the in-flight `flip` check).
6. **Word-click TTS coexistence**: a plain tap on a word still triggers speech
   (pointer capture stays deferred past `DRAG_CAPTURE_THRESHOLD_PX`); only a real
   horizontal drag turns the page.
7. **Reduced motion**: with `prefers-reduced-motion: reduce`, a page change is
   instant (no animation) and lands on the correct page.
8. Quiz final page still renders its embed correctly after flipping to it.
9. `npm run build` (or `tsc --noEmit`) + lint clean.
