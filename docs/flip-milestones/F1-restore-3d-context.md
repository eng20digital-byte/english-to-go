# F1 — Restore the 3D flip context

## Goal
The turning leaf renders as a true 3D fold (real depth/perspective, correct
front→back handoff at 90°), not a flattened 2D slide.

## Background
The working tree added `overflow: hidden` to `.page-flip-sheet`
([src/index.css](../../src/index.css)). That same element carries
`transform-style: preserve-3d`. Per the CSS spec, `overflow` (and `clip-path`,
`opacity`, `filter`, `clip`) force the element's `transform-style` back to
`flat`, which collapses the 3D space its two faces live in. The midpoint
front→back face handoff therefore composites wrong in **both** flip directions.

## Scope
- [src/index.css](../../src/index.css): **remove `overflow: hidden;` from
  `.page-flip-sheet`.** Keep `left:50%; width:50%; transform-origin:left center;
  transform-style:preserve-3d; z-index:2; animation-fill-mode:forwards`.
- Update the `.page-flip-sheet` comment to state the hard rule: no
  `overflow` / `clip-path` / `opacity` / `filter` may ever sit on this element,
  because any of them silently forces `transform-style: flat` and breaks the
  fold. Half-clipping happens on child wrappers instead (see F3).

## Out of scope
- The `prev`-direction page-content bug (that is F2 — it is independent of this
  3D fix; `next` is already correct content-wise).
- Switching the half-isolation technique to `clip-path` (that is F3). After F1,
  half-isolation still uses the existing `overflow:hidden` on the faces /
  base panels — which is fine, because those elements are flat leaves, not the
  `preserve-3d` sheet.

## Manual verification
1. `npm run dev`, open a published booklet `/b/:token` with ≥3 pages.
2. Trigger a **next** flip and freeze it mid-turn (DevTools → animations, or a
   breakpoint): the leaf shows genuine perspective/depth (a curling page), not a
   flat horizontal squash.
3. The arriving page's content appears on the leaf only after ~90° and the frame
   reads as one coherent open book at completion — no wrong backside visible
   before the midpoint.
4. No console errors; `npm run build` (or `tsc --noEmit`) + lint clean.
