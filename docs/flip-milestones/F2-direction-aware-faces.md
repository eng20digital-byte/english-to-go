# F2 — Direction-aware leaf faces

## Goal
The **prev** flip shows the correct half-pages with no content jump at the start
(left half) or end (right half), matching the already-correct **next** flip.

## Background
In [src/reader/PageFlip.tsx](../../src/reader/PageFlip.tsx) the leaf faces are
fixed regardless of direction:

```ts
const frontIndex = flip ? flip.fromIndex : null;
const backIndex  = flip ? flip.toIndex   : null;
```

The base panels (`leftBaseIndex` / `rightBaseIndex`) already switch on direction,
but the faces don't. The front face always presents a RIGHT half and the back
face always a LEFT half — but *which index* feeds each must depend on direction
(see the table in [README.md](README.md)). With the fixed assignment, a prev
flip puts the wrong page on the leaf: the left half jumps at the start and the
right half jumps at the end.

## Scope
- [src/reader/PageFlip.tsx](../../src/reader/PageFlip.tsx): make the face indices
  direction-aware:
  ```ts
  // front face = RIGHT half; back face = LEFT half
  const frontIndex = flip ? (flip.direction === 'next' ? flip.fromIndex : flip.toIndex) : null;
  const backIndex  = flip ? (flip.direction === 'next' ? flip.toIndex   : flip.fromIndex) : null;
  ```
- Update the adjacent comment to record: front always shows a RIGHT half, back
  always a LEFT half; only the source index flips with direction.
- Leave `leftBaseIndex` / `rightBaseIndex` as-is (already correct).

## Out of scope
- The clip-path structural refactor (F3) — this milestone keeps the existing
  rendering structure and only corrects the indices.

## Manual verification
1. `npm run dev`, open a published booklet `/b/:token` with ≥3 pages, navigate to
   a middle page.
2. **Next** flip (right arrow / `ArrowRight` / swipe-left): still correct — no
   regression; lands on a coherent next canvas, no flash.
3. **Prev** flip (left arrow / `ArrowLeft` / swipe-right): **confirm no jump at
   the start (left half) and no jump at the end (right half)** — the content
   swaps cleanly at the 90° midpoint and lands on the coherent previous canvas.
4. Flip next then immediately prev repeatedly — pages stay consistent, no drift.
5. `npm run build` (or `tsc --noEmit`) + lint clean.
