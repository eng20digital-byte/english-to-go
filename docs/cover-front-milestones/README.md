# Front cover — closed-book opening

Milestones to add a **front cover** to booklets: each book starts **closed**,
showing only a single-page-width front cover; opening it the first time flips the
cover naturally, after which the book behaves exactly as it does today (two-page
spreads + the existing [page-flip](../flip-milestones/README.md)).

Decided with the user:

- **Cover = admin-designed canvas** — a designable single-page (portrait ~960×1080)
  canvas, edited with the existing editor like any page.
- **Closed look = centered, expands open** — the closed cover is centered; the book
  expands from one page to the full spread as the cover swings open.
- **Re-closable** — *previous* on the first spread re-closes the book.

Hard constraint: **do not break the existing flip logic or page visibility.** The
shared renderer ([src/renderer/PageCanvas.tsx](../../src/renderer/PageCanvas.tsx))
and [src/reader/PageFlip.tsx](../../src/reader/PageFlip.tsx) must keep working
identically for normal spreads — `PageFlip` is **never forked or behaviourally
changed**; it keeps operating only on the spread pages.

## Data-model note (read first)

There is no separate "cover" table. The cover is a **`pages` row flagged
`is_cover`**, pinned to `page_order = 0`, at most one per booklet — it reuses
`page_elements`, `save_page_elements`, the editor, and the renderer. Its canvas
size is **derived, not stored**: `is_cover` ⇒ `COVER_CANVAS_WIDTH × COVER_CANVAS_HEIGHT`
= `CANVAS_WIDTH/2 × CANVAS_HEIGHT` (960×1080). Booklets without a cover behave
exactly as today; covers are added by the admin (no auto-backfill).

## The key geometry insight

The right half of a 1920×1080 spread is exactly **960×1080 — the same size as a
single-page cover.** So the cover leaf reuses the page-flip's existing half-width
leaf geometry (`left:50%; width:50%; transform-origin:left center`, rotating
`0° → -180°`). The only genuinely new mechanics are:

1. a **per-page canvas size** flowing through the (un-forked) renderer, and
2. the reader's **centered→expanded** open/close transition (cover chrome only).

## Milestones (in order)

1. [C1 — Data model + renderer parametrization](C1-data-renderer-foundation.md) —
   `is_cover` column + `add_cover_page` RPC + cover-pinned invariants; thread an
   optional per-page canvas size through `PageCanvas`/`useCanvasScale` (defaults
   unchanged). No visible behaviour change yet.
2. [C2 — Admin: design the cover page](C2-admin-design-cover.md) — edit the cover
   on a portrait canvas; "Add Cover" + cover guards in the pages sidebar.
3. [C3 — Reader: closed cover that opens/closes](C3-reader-closed-cover.md) — the
   centered closed-book stage, the open/close animation, nav/indicator/keyboard/
   swipe/reduced-motion handling. `PageFlip` untouched.

## Fix set (after C3)

4. [C4 — Cover sizing + open-animation rework](C4-cover-open-rework.md) — corrects
   two issues found in the shipped closed cover: it rendered **too large / clipped
   at the bottom** (closed layout ignored the open book's width bound), and the
   open animation **slid and flipped at once** instead of *slide-then-flip*. Fix:
   the closed state reuses the open-animation's full-spread clipped/translated
   geometry (correct size by construction) and the animation is sequenced. Scoped
   to `BookCover` + `index.css` + one reader constant; `ReaderBookletPage`'s state
   machine, `PageFlip`, the renderer and the data model are untouched. Split into:
   - [C4.1 — Unify cover geometry + fix closed sizing](C4.1-unify-cover-geometry.md)
   - [C4.2 — Sequential open animation (slide → flip)](C4.2-sequential-open-animation.md)
   - [C4.3 — Sequential re-close animation (flip → collapse)](C4.3-sequential-reclose-animation.md)

Each milestone leaves the app in a verifiably-working state and is committed on
its own (small, focused commits per CLAUDE.md working process). Update
[CLAUDE.md](../../CLAUDE.md) in the same commit whenever a milestone introduces a
new convention (the cover concept, per-page canvas dims, the `0004` migration).
