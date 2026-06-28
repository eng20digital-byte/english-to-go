# Back cover — closed-book ending

Milestones to add a **back cover** to booklets: each book can end **closed**,
showing only a single-page-width back cover after the last spread; navigating
backward from it returns to the last spread with the same 3D flip in reverse.
Booklets without a back cover behave exactly as today.

Builds on the [front cover](../cover-front-milestones/README.md) — all the
infrastructure that milestone introduced (per-page canvas size, shared renderer
params, `is_cover` flag, `BookCover.tsx`, `CoverState` machine) is already in
place. The back cover reuses every pattern; only the geometry is mirrored.

Decided:

- **Back cover = same portrait canvas** — 960×1080, derived from `is_back_cover`
  flag, edited with the same editor and element tools as the front cover.
- **Pinned last** — always at `max(page_order)`; `reorder_pages` enforces this
  the same way it pins the front cover at 0.
- **Enter from last spread** — *next* on the last spread closes the book to the
  centered back cover portrait.
- **Exit to last spread** — *previous* on the back cover re-opens to the last
  spread.

Hard constraint: **do not change `PageFlip.tsx`, the shared renderer, or any
front-cover logic.** The back cover state machine lives entirely in the reader
chrome alongside the existing `CoverState` machine; both co-exist independently.

## The key geometry insight

The back cover mirrors the front cover:

| | Front cover | Back cover |
|---|---|---|
| Half of spread | Right half (960 px) | Left half (960 px) |
| Leaf `left` | `50%` | `0%` |
| Leaf `transform-origin` | `left center` | `right center` |
| Closed `clip-path` | `inset(0 0 0 50%)` | `inset(0 50% 0 0)` |
| Closed `transform` | `translateX(-25%)` | `translateX(25%)` |
| Enter leaf rotation | `0° → -180°` (open) | `180° → 0°` (close from back) |
| Exit leaf rotation | `-180° → 0°` | `0° → 180°` |
| Back face shows | spread 0 **left** half | last spread **right** half |
| Fore-edge stack side | Right (`left: 75%`) | Left (`right: 75%`) |
| Spine shadow side | Left (`left: 25%`) | Right (`right: 25%`) |

The card clip-path animation is also the mirror image:
- Front cover opening: `inset(0 0 0 50%) → inset(0 0 0 0)` (expands rightward)
- Back cover entering: `inset(0 0 0 0) → inset(0 50% 0 0)` (collapses leftward)

Exactly one new component ([`BookBackCover.tsx`](../../src/reader/BookBackCover.tsx))
and one new block of CSS — no forks of any existing file's logic.

## Milestones (in order)

1. [B1 — Data model + renderer parametrization](B1-data-renderer-foundation.md) —
   `is_back_cover` column + `add_back_cover_page` RPC + updated quiz invariant +
   `reorder_pages` pins both covers; extend `pageCanvasSize` for back cover. No
   visible behaviour change.
2. [B2 — Admin: design the back cover page](B2-admin-design-back-cover.md) —
   "Add Back Cover" button, portrait editor canvas, "Back" badge thumbnail, same
   drag/clipboard guards as the front cover.
3. [B3 — Reader: back cover that enters / exits](B3-reader-back-cover.md) —
   `BackCoverState` machine in `ReaderBookletPage`, new `BookBackCover.tsx`,
   nav / keyboard / swipe / reduced-motion. Sub-milestones:
   - [B3.1 — Split back cover from spreads](B3.1-split-back-cover-from-spreads.md)
   - [B3.2 — Back cover instant (reduced-motion baseline)](B3.2-back-cover-instant.md)
   - [B3.3 — Enter animation (last spread → back cover)](B3.3-enter-animation.md)
   - [B3.4 — Exit animation (back cover → last spread)](B3.4-exit-animation.md)

Each milestone leaves the app in a verifiably-working state. Commit after each
sub-milestone with a clear message. Update [CLAUDE.md](../../CLAUDE.md) in the
B1 commit (new convention: `is_back_cover`, updated quiz invariant, `B1`
migration) and again after B3.4 (back cover reader section).
