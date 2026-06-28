# C3 — Reader: closed cover that opens / closes

## Goal
A booklet **with a cover** opens **closed** — only the centered, single-page front
cover is visible. Opening it (click / next / ArrowRight / swipe-left) flips the
cover open while the book expands to the full spread; afterward paging behaves
exactly as today. *Previous* on the first spread re-closes the book. Booklets
without a cover behave identically to today.

## Background
[PageFlip.tsx](../../src/reader/PageFlip.tsx) treats each spread as a two-page
canvas and folds only the right half around the centre spine. The cover must be a
**separate** element shown only at the beginning, so `PageFlip` is left
**untouched** and keeps operating only on the spread pages. The new closed-book
stage lives in the reader chrome
([ReaderBookletPage.tsx](../../src/reader/ReaderBookletPage.tsx) + a new
`src/reader/BookCover.tsx`), under `#reader-root`.

Geometry reuse: the right half of a full spread is 960×1080 = the cover size, so
the cover leaf reuses the page-flip leaf geometry (`left:50%; width:50%;
transform-origin:left center`, rotate `0° → -180°`).

## Scope

### Split cover from spreads
In `ReaderBookletPage`: `cover = pages.find(p => p.is_cover)` (always index 0 when
present); `spreads = cover ? pages.slice(1) : pages`. **All** existing open-book
logic — `clampedIndex`, the dot/progress indicator + counter, `VocabularyPanel`,
prev/next disabled, the `.book-edge` sheet stacks, and `PageFlip` — operates on
**`spreads`**, so the cover is never counted and spread behaviour is unchanged.

### Cover state machine
`coverState: 'closed' | 'open'` (+ transient `'opening' | 'closing'`). Initial
`'closed'` when a cover exists, else `'open'` (no cover ⇒ today's behaviour).

### Closed / animating render (`BookCover`)
Render `BookCover` instead of the open book while not open.

- **Closed look**: the cover canvas (`PageCanvas` with cover dims from C1) in a
  **centered single-page card** (aspect 960:1080) with closed-book chrome —
  fore-edge page-stack on the right, spine shadow on the binding (left) edge —
  reusing the `.book-edge` / `.book-spine` visual language
  ([index.css](../../src/index.css#L303)).
- **Open transition** (centered → expanded), one synchronized animation over
  `PAGE_FLIP_DURATION_MS` / `PAGE_FLIP_EASING` (reuse
  [config/reader.ts](../../src/config/reader.ts) + a perspective wrapper):
  1. the cover **leaf** rotates `0° → -180°` around its binding (left) edge — same
     geometry/shading as `.page-flip-sheet`; it occupies the right half of the
     full-spread card. Back face = spread 0's **left** page, revealed past 90°.
  2. spread 0 is **revealed** underneath (`PageCanvas` of `spreads[0]`).
  3. the card **expands** single-page → full-spread and **re-centers** (animate an
     `inset()` clip-path + `translateX` on the **flat** card so the spine appears
     fixed while the second page grows in).
  - **HARD RULE** (same as the flip): never put `overflow` / `clip-path` /
    `opacity` / `filter` on the `preserve-3d` leaf — clip/translate live on the
    flat card only.
- On `onAnimationEnd` → `coverState = 'open'`; `ReaderBookletPage` renders the
  normal book wrapper + `PageFlip` over `spreads` at index 0.

### Re-close
`prev` while open **at spread 0** → `coverState = 'closing'` plays the reverse →
ends `'closed'`. Intercept this in the reader's prev handler before delegating to
`PageFlip`.

### Input, indicator, motion
- While closed: click/tap cover, next arrow, `ArrowRight`, swipe-left, `Enter`
  open it; `prev` disabled/hidden; hide the spread page-stack edges + page
  indicator (or show a subtle "Cover" state).
- **Reduced motion**: skip the animation, jump closed ⇄ open (mirror
  `prefersReducedMotion()` in PageFlip).
- Loading/error states and the quiz page (last spread) are unaffected.

## Out of scope
- Any change to `PageFlip.tsx` or the spread flip behaviour.
- Per-booklet reading-direction changes (LTR convention stays, see CLAUDE.md).

## Manual verification
1. **Cover present**: open `/b/:token` → only the **centered closed cover** shows
   (single-page width), no spread visible.
2. Click cover / next / ArrowRight / swipe-left → the cover flips open and the book
   expands to the full spread; afterward flip, dots/counter (counting **spreads
   only**), vocab panel, and sheet edges all behave exactly as before.
3. On the first spread, `prev` / ArrowLeft / swipe-right **re-closes** to the
   cover.
4. `prefers-reduced-motion: reduce` → opens/closes instantly, no animation.
5. **No cover**: a booklet without a cover opens straight to spread 0 and behaves
   identically to today (regression check).
6. Quiz embed still renders on the last page. `npm run lint` + typecheck clean.
