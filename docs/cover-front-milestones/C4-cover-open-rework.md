# C4 — Cover sizing + open-animation rework (fix set)

> Follow-up fix to [C3](./C3-reader-closed-cover.md) and its split
> ([C3.1](./C3.1-split-cover-from-spreads.md)–[C3.4](./C3.4-reclose-from-spread-0.md)).
> Corrects two issues found in the shipped closed-cover stage. **Does not touch**
> the data model (C1), the admin cover editor (C2), or `PageFlip` — same hard
> constraint as the original set: `PageFlip` is never forked or behaviourally
> changed.

## Why this exists

Two problems with the closed cover as shipped:

1. **The centered closed cover renders too large and clips at the bottom.** The
   closed layout in [BookCover.tsx](../../src/reader/BookCover.tsx) sizes itself
   `height: min(100vh - 40px, COVER_CANVAS_HEIGHT)` + `aspectRatio 960/1080` with
   **no width constraint**. But the open book
   ([ReaderBookletPage.tsx](../../src/reader/ReaderBookletPage.tsx)) is
   `flex:1` + `maxWidth: min(READER_MAX_WIDTH, (100vh-40) * SPREAD_ASPECT)`, so on
   any viewport that isn't ~16:9 it becomes **width-bound** and its half-page is
   *shorter* than `100vh-40`. The closed cover ignores that width bound, so it
   renders taller/wider than the open book's actual right page — bigger than it
   should be, and right at (or past) the bottom edge.

2. **The open animation slides and flips at once.** `book-cover-expand`
   (clip-path un-clip + `translateX(-25%)→0`) runs *simultaneously* with the leaf
   rotation (`page-turn-next`). The intended feel is **sequential**: the centered
   half-page cover first *slides into the right-hand page slot of the open book*,
   and only **then** the cover flips open into the first spread.

## Decided with the user

- **Open finish = flip the cover open.** After the slide, the cover does the
  existing 3D page-turn (leaf `0°→-180°`) to reveal spread 0 — the current leaf
  mechanism, just sequenced *after* the slide. (Not a cross-fade.)
- **Closed look = keep the thick-book decorations.** The centered cover keeps its
  right fore-edge page-stack and left binding/spine shadow, resized to the new
  (correct) half-page dimensions.

## The fix, in one idea

Make the **closed state reuse the open-animation's full-spread geometry**, held
static at its first frame, instead of a separate height-only portrait box. The
closed cover then *is* the clipped right-half of the **same flex box the open book
uses**, so it matches the open book's right page **by construction** — the same
"alignment guaranteed by construction, not by careful coding" principle the
shared renderer already relies on. That single change fixes the sizing bug *and*
gives the open/close animations a seamless start/end frame.

Concretely (full detail in the sub-milestones):

- **Geometry**: outer box `flex:1` + `maxWidth: min(READER_MAX_WIDTH, (100vh-40) *
  SPREAD_ASPECT)` (identical to the open-book wrapper); a full-spread card
  (`aspectRatio 1920/1080`) inside it. The closed framing is the held first frame
  of `book-cover-expand`: `clip-path: inset(0 0 0 50%)` + `transform:
  translateX(-25%)` → the cover (the leaf's front face) shows centered at box
  `[25%..75%]`, exactly half-page-sized.
- **Single JSX tree** for `closed` / `opening` / `closing` (differing only by
  className / inline animation vars), so `closed → opening` reconciles in place —
  no remount flash at the handoff.
- **Sequential animation** via an animation delay: the card reframe
  (`book-cover-expand`) runs first for `COVER_REFRAME_DURATION_MS`; the leaf flip
  (`page-turn-next`) is delayed by that amount. Close mirrors it: leaf flips shut
  first, then the card collapses.

## Files touched (all three milestones)

- [src/reader/BookCover.tsx](../../src/reader/BookCover.tsx) — collapse the two
  layouts into one tree; closed = static first frame; sequence the animations;
  re-wire the close callback.
- [src/index.css](../../src/index.css) — `book-cover-expand` /
  `book-cover-collapse` become reframe-only (durations/delays driven by config
  vars); chrome positioning notes.
- [src/config/reader.ts](../../src/config/reader.ts) — new
  `COVER_REFRAME_DURATION_MS` (no magic numbers in components).

**Unchanged on purpose:** `ReaderBookletPage.tsx` (the `closed/opening/closing/
open` state machine, `openCover`/`closeCover`/`finishOpen`/`finishClose`, and the
reduced-motion instant paths all keep working as-is — the rework is entirely
inside `BookCover` + CSS + one config constant), `PageFlip.tsx`, the renderer, and
the data model.

## Milestones (in order)

1. [C4.1 — Unify cover geometry + fix closed sizing](C4.1-unify-cover-geometry.md)
   — closed state reuses the full-spread clipped/translated geometry; thick-book
   chrome repositioned; sizing correct by construction. Animation still combined
   (no behaviour-sequencing change yet) — this milestone is the sizing fix only.
2. [C4.2 — Sequential open animation (slide → flip)](C4.2-sequential-open-animation.md)
   — split the combined expand+flip into reframe-then-flip via the leaf delay.
3. [C4.3 — Sequential re-close animation (flip → collapse)](C4.3-sequential-reclose-animation.md)
   — mirror it for close, and move the close callback onto the card (now the last
   element to finish).

Each leaves the app verifiably working and is committed on its own (small, focused
commits per CLAUDE.md). Update [CLAUDE.md](../../CLAUDE.md) in the same commit only
if a milestone introduces a lasting convention (e.g. the new reader constant).

## Reduced motion

Unchanged: `prefersReducedMotion()` still makes open/close instant (parent jumps
straight to `'open'`/`'closed'`). The sequencing in C4.2/C4.3 only affects the
animated path. Verify the instant path still lands on the correctly-sized centered
cover after C4.1.
