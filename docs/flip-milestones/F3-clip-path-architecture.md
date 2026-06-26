# F3 — clip-path half-isolation architecture

## Goal
Replace the `overflow:hidden` + 200%-wrapper-shift trick with the clean, strict
3-layer structure that isolates page halves via `clip-path`, exactly as
specified — without ever putting a flattening property on the `preserve-3d` leaf.

## Background
Halves are currently isolated by wrapping each in a 50%-wide `overflow:hidden`
panel and shifting an inner 200%-wide page wrapper into place. It works but is
hard to reason about and is where the original mid-flip bugs hid. `clip-path`
makes the base layer trivial (full-canvas div, clipped) and the leaf faces
explicit. Depends on F1 (3D restored) and F2 (correct indices).

## The three layers (within the existing `perspective` container)
1. **Static left background** — full-canvas div, `clip-path: inset(0 50% 0 0)`,
   `renderPage(leftBaseIndex)`. Shows the LEFT half of the page staying on the left.
2. **Static right background** — full-canvas div, `clip-path: inset(0 0 0 50%)`,
   `renderPage(rightBaseIndex)`. The NEXT/revealed RIGHT half, waiting under the leaf.
3. **The flipping leaf** — `.page-flip-sheet` (`left:50%; width:50%; preserve-3d`,
   no clipping on it), with two `backface-visibility:hidden` faces:
   - **Front face** (visible 0°→90°): inner wrapper `left:-100%; width:200%`
     (re-expands content to true canvas size, right half into the face window)
     + `clip-path: inset(0 0 0 50%)`, `renderPage(frontIndex)`.
   - **Back face** (visible 90°→180°): pre-rotated `rotateY(180deg)`; inner
     wrapper `left:0; width:200%` + `clip-path: inset(0 50% 0 0)`,
     `renderPage(backIndex)`. The leaf's `-180°` × the face's `180°` cancel the
     mirror, landing this half un-mirrored over the canvas left (verified at
     `left:0`).

## Scope
- [src/reader/PageFlip.tsx](../../src/reader/PageFlip.tsx):
  - Replace the two 50%-panel base blocks with two full-canvas `clip-path` divs
    (`position:absolute; inset:0`).
  - Add `clipPath` to the front/back face inner wrappers (keep their existing
    `left`/`width` offsets, which position the correct half in the face window).
  - Keep `.book-spine`, `.page-flip-gutter`, both `.page-flip-shade` overlays,
    the `key` on the sheet (restarts the animation), and `onAnimationEnd={finishFlip}`.
- [src/index.css](../../src/index.css):
  - `.page-flip-face`: `overflow:hidden` may stay as a harmless safety clip (a
    face is a flat 3D leaf, not a `preserve-3d` parent). Update its comment to
    say halves are now isolated by `clip-path` on the inner wrapper.
  - No new magic numbers; keep `src/config/reader.ts` values (CLAUDE.md rule).

## Out of scope
- Behavior changes — F3 is a structural cleanup; the flip should look identical
  to the end of F2, just driven by `clip-path` and a simpler base layer.
- Any change to `PageCanvas` / the renderer.

## Manual verification
1. `npm run dev`, open a published booklet `/b/:token` with ≥3 pages.
2. **Next** and **prev** flips both still correct (no regression from F2), no
   flash/jump at completion.
3. Inspect the DOM mid-flip: base layers are two full-canvas `clip-path` divs;
   `.page-flip-sheet` carries **no** `overflow`/`clip-path`/`opacity`; faces clip
   via the inner wrapper; halves line up exactly on the spine (no seam/gap).
4. Content inside the leaf is full-size (not shrunk to 50%).
5. `npm run build` (or `tsc --noEmit`) + lint clean.
