# B1 — Data model + renderer parametrization

## Goal
A booklet can have a single **back cover page** (`is_back_cover`, pinned to
`max(page_order)`), and the shared renderer already supports portrait dims from
the front cover work — this milestone just extends the flag and the quiz
invariant. **Zero visible behaviour change** to existing booklets, editor, or
reader. Pure foundation for B2/B3.

## Background
The front cover milestone (C1/`0004`) added `is_cover`, `add_cover_page`, and
per-page canvas dims. The back cover reuses all of that infrastructure. Two
things need extending:

1. **A new DB column + RPC** — same shape as `is_cover` / `add_cover_page` but
   pinned at the end instead of position 0.
2. **The quiz-page invariant** — currently "only `max(page_order)` may be
   `is_quiz_page`". With the back cover at the end, the last *content* page is
   now `max(page_order) - 1`. Every existing RPC that enforces this invariant
   needs updating to "only the last non-back-cover page".

The renderer (`PageCanvas`, `useCanvasScale`) already accepts optional
`canvasWidth`/`canvasHeight` — the only TS-layer change is extending
`pageCanvasSize` to handle the back cover flag.

## Scope

### Migration — `supabase/migrations/0005_back_cover_page.sql`

Follow the 0004 pattern exactly (`security definer`; explicit `is_admin()` check;
re-enforce quiz invariant after every structural change).

**New column + index:**
```sql
alter table pages add column is_back_cover boolean not null default false;

create unique index pages_one_back_cover_per_booklet
  on pages (booklet_id) where is_back_cover;
```

**`add_back_cover_page(p_booklet_id uuid) returns pages`** — admin-gated; raise
if a back cover already exists; append at `max(page_order) + 1` with
`is_back_cover = true, is_quiz_page = false` (no page shifts needed — it always
goes to the end); re-enforce the *updated* quiz invariant (see below); return the
row.

**Updated quiz invariant** — used in `add_back_cover_page` and in every
recreated RPC below:
```sql
-- Only the last non-back-cover page may be is_quiz_page.
update pages set is_quiz_page = false
where booklet_id = p_booklet_id
  and is_quiz_page = true
  and not is_back_cover
  and page_order <> (
    select max(page_order) from pages
    where booklet_id = p_booklet_id and not is_back_cover
  );
```

**Update `reorder_pages` (CREATE OR REPLACE)** — pin *both* covers; front at 0,
back at max:
```sql
order by (
  case when p.is_cover      then 0
       when p.is_back_cover then 2
       else                      1
  end
), t.ord
```
The `row_number() - 1` that follows produces a contiguous `0..n-1` sequence with
the front cover always at 0, content pages 1..n-2, back cover at n-1.

**Recreate the other four RPCs (CREATE OR REPLACE)** with the updated invariant
so they don't demote a quiz page that is now second-to-last (not last):
`add_page`, `delete_page`, `duplicate_page`, `insert_page_with_elements`.
No logic changes to these RPCs beyond swapping the invariant SQL block.

**Grant:**
```sql
grant execute on function add_back_cover_page(uuid) to authenticated;
```
(The recreated functions inherit their existing grants; only the new one needs
an explicit grant.)

### Types & data

- [src/types/database.ts](../../src/types/database.ts): add
  `is_back_cover: boolean` to `PageRow`.
- [src/hooks/useBookletQuery.ts](../../src/hooks/useBookletQuery.ts): add
  `is_back_cover` to both the **reader** select + `ReaderBookletPage` type and
  the **admin** detail select, alongside the existing `is_cover` — one field
  each, no structural change.

### Config

- [src/config/canvas.ts](../../src/config/canvas.ts): extend `pageCanvasSize` to
  accept the back cover flag — same 960×1080 dims apply:
  ```typescript
  export function pageCanvasSize(isCover: boolean, isBackCover = false) {
    return (isCover || isBackCover)
      ? { width: COVER_CANVAS_WIDTH, height: COVER_CANVAS_HEIGHT }
      : { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
  }
  ```
  Update all existing call sites (editor + reader) to pass `page.is_back_cover`
  as the second argument — defaults to `false` so any site you miss is safe.

### Renderer

No changes. `PageCanvas` and `useCanvasScale` already accept optional canvas
dims and default to 1920×1080 — the same optional props used by `BookCover`
will be used by `BookBackCover` in B3.

## Out of scope
- Any editor UI to create or edit the back cover (B2).
- Any reader back-cover stage / animation (B3).
- Auto-creating or backfilling back covers on existing booklets.

## Manual verification
1. Apply `0005` in Supabase; existing booklets open in admin and reader and
   render pixel-identically (nothing reads `is_back_cover` yet).
2. In Supabase Studio, call `add_back_cover_page(<booklet_id>)`: a row appears
   with `is_back_cover = true` at `max(page_order)`; all other pages are
   unchanged. Calling again raises (one back cover per booklet).
3. **Quiz invariant:** on a booklet that already has a quiz page, call
   `add_back_cover_page` — the quiz page *stays* marked `is_quiz_page` (it is
   now second-to-last, not last, but the updated invariant allows it).
4. **`reorder_pages`** with the back cover not last in the input array → it still
   ends at `max(page_order)`; front cover (if present) still stays at 0.
5. `npm run lint` + typecheck clean; no existing tests regress.
