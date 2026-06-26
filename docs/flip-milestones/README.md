# Reader page-flip — centre-spine rewrite

Focused milestones to finish the half-built conversion of the reader's 3D
page-turn from a **full-page** flip (whole canvas hinged at its left edge) to a
**book-in-centre** flip (spine at 50%, only the right half folds as a leaf), and
fix the two bugs that make pages render incorrectly mid-flip.

Touches only the reader chrome: [src/reader/PageFlip.tsx](../../src/reader/PageFlip.tsx)
and the page-flip styles in [src/index.css](../../src/index.css). The shared
renderer ([src/renderer/PageCanvas.tsx](../../src/renderer/PageCanvas.tsx)) is
**never** touched (CLAUDE.md: never fork the renderer).

## Data-model note (read first)

There is no "spreads" table. Each booklet **page index** is one full 1920×1080
(16:9 landscape) canvas, rendered by `renderPage(index, scale)` → `PageCanvas`.
The flip *visually* treats each canvas as a two-page spread by isolating its
left/right halves around the centre. So "current spread" = `renderPage(currentIndex)`,
"next spread" = `renderPage(currentIndex + 1)`.

## The leaf geometry (shared by every milestone)

Leaf = a right-half element: `left:50%; width:50%; transform-origin:left center`
(pivot on the spine), rotating `0° → -180°` (next) / `-180° → 0°` (prev). At `0°`
it lies on the right (front face up); at `-180°` it lies on the left (back face
up). The **front face always presents a RIGHT half; the back face always a LEFT
half** — only *which page index* feeds each face changes by direction:

| element | shows | NEXT | PREV |
|---|---|---|---|
| base-left (static) | LEFT half | `fromIndex` | `toIndex` |
| base-right (static, revealed) | RIGHT half | `toIndex` | `fromIndex` |
| leaf **front** face | RIGHT half | `fromIndex` | `toIndex` |
| leaf **back** face | LEFT half | `toIndex` | `fromIndex` |

clip-path half-isolation: left half = `clip-path: inset(0 50% 0 0)`, right half =
`clip-path: inset(0 0 0 50%)`. `clip-path` may live only on flat leaf
wrappers / base panels — **never** on the `preserve-3d` leaf itself.

## Milestones (in order)

1. [F1 — Restore the 3D flip context](F1-restore-3d-context.md) — remove the
   `overflow` that silently flattens `preserve-3d`. Fixes mid-flip rendering in
   both directions.
2. [F2 — Direction-aware leaf faces](F2-direction-aware-faces.md) — fix the
   **prev** flip showing the wrong half-pages.
3. [F3 — clip-path half-isolation architecture](F3-clip-path-architecture.md) —
   replace the overflow + 200%-wrapper-shift trick with the clean 3-layer
   clip-path structure.
4. [F4 — Cross-direction QA & polish](F4-qa-polish.md) — full verification both
   directions, reduced-motion, TTS-tap coexistence, edges; tune depth/shadow.

Each milestone leaves the reader in a verifiably-better state and is committed
on its own (small, focused commits per CLAUDE.md working process).
