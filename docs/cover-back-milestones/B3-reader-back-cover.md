# B3 — Reader: back cover that enters / exits

## Goal
A booklet **with a back cover** allows the reader to "close the book" from the
end: *next* on the last spread closes to the centered portrait back cover; *prev*
on the back cover re-opens to the last spread. Booklets without a back cover are
unaffected; front cover behaviour is unaffected.

## Background
[PageFlip.tsx](../../src/reader/PageFlip.tsx) is left **completely untouched**
and keeps operating only on the spread pages. The new back-cover stage lives in
the reader chrome alongside the existing `CoverState` machine —
[ReaderBookletPage.tsx](../../src/reader/ReaderBookletPage.tsx) + a new
[`src/reader/BookBackCover.tsx`](../../src/reader/BookBackCover.tsx).

Geometry reuse: the left half of a 1920×1080 spread is exactly 960×1080 = the
back cover size. The back cover leaf reuses `preserve-3d`, `backface-visibility:
hidden`, and the same shade keyframes as the existing page-flip — only its
position and rotation direction are mirrored.

## Sub-milestones (in order)

Implement and commit each sub-milestone before starting the next.

1. [B3.1 — Split back cover from spreads](B3.1-split-back-cover-from-spreads.md)
2. [B3.2 — Back cover instant (reduced-motion baseline)](B3.2-back-cover-instant.md)
3. [B3.3 — Enter animation (last spread → back cover)](B3.3-enter-animation.md)
4. [B3.4 — Exit animation (back cover → last spread)](B3.4-exit-animation.md)

## Out of scope
- Any change to `PageFlip.tsx` or spread flip behaviour.
- Any change to the front cover (`BookCover.tsx`, `CoverState`).
- Per-booklet reading-direction changes (LTR convention stays, CLAUDE.md).

## Manual verification (after B3.4)
1. **Back cover present**: at the last spread, *next* / ArrowRight / swipe-left
   closes to the **centered back cover portrait** (left side of the spread);
   `PageFlip` and the page indicator unmount.
2. On the back cover, *prev* / ArrowLeft / swipe-right re-opens to the last
   spread with the reverse animation.
3. **Dot / progress indicator** counts *spreads* only — back cover is not counted
   and does not affect the indicator.
4. `prefers-reduced-motion: reduce` → enters/exits the back cover instantly.
5. **No back cover**: a booklet without a back cover — *next* is disabled at the
   last spread exactly as before (regression check).
6. **Both covers**: a booklet with front + back cover: open from front, read all
   spreads, reach back cover; prev from back cover returns to last spread; can
   still re-close the front cover from spread 0.
7. **Quiz page**: if the quiz page is the last spread (second-to-last page in
   DB), it still renders the quiz embed correctly; reaching back cover from it
   works.
8. `npm run lint` + typecheck clean.
