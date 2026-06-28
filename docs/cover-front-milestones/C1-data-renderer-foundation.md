# C1 — Data model + renderer parametrization

## Goal
A booklet can have a single **cover page** (`is_cover`, pinned to `page_order = 0`),
and the shared renderer can draw a canvas at a non-default (portrait) size — with
**zero visible change** to existing booklets, editor, or reader. Pure foundation
for C2/C3.

## Background
Every `pages` row today is a full 1920×1080 spread; the renderer hardcodes that
size ([PageCanvas.tsx:27-28](../../src/renderer/PageCanvas.tsx#L27),
[useCanvasScale.ts:16](../../src/renderer/useCanvasScale.ts#L16)). The cover needs
(a) a flag + ordering invariants in the DB, and (b) a portrait 960×1080 render
size. The canvas size is **derived from `is_cover`**, not stored per page.

## Scope

### Migration — `supabase/migrations/0004_cover_page.sql`
Follow the 0002/0003 pattern (`security definer`; defer
`unique(booklet_id, page_order)` for multi-row renumbers; re-enforce "only the
last page may be `is_quiz_page`").

- `alter table pages add column is_cover boolean not null default false;`
- Partial unique index — at most one cover per booklet:
  `create unique index pages_one_cover_per_booklet on pages (booklet_id) where is_cover;`
- `add_cover_page(p_booklet_id uuid) returns pages` — admin-gated; raise if a
  cover already exists; defer the order constraint; push existing pages down
  (`update pages set page_order = page_order + 1 where booklet_id = ...`); insert
  at `page_order = 0, is_cover = true`; re-enforce the quiz-last invariant; return
  the row.
- Update `reorder_pages` to **pin the cover at order 0** regardless of the incoming
  array (force it first, sequence the rest). Verify `add_page` (append),
  `delete_page` (contiguous renumber by existing order), and
  `insert_page_with_elements`/`duplicate_page` (insert after an existing page) all
  leave the cover first — `delete_page`'s `row_number() over (order by page_order)`
  already does.

### Types & data
- [src/types/database.ts](../../src/types/database.ts): add `is_cover: boolean` to
  `PageRow`.
- [src/hooks/useBookletQuery.ts](../../src/hooks/useBookletQuery.ts): add
  `is_cover` to the **reader** select + `BookletQueryRow.pages` +
  `ReaderBookletPage`, mapped through; and to the **admin detail** select (it
  already selects `is_quiz_page` — add `is_cover` beside it).

### Config
- [src/config/canvas.ts](../../src/config/canvas.ts):
  `export const COVER_CANVAS_WIDTH = CANVAS_WIDTH / 2;`
  `export const COVER_CANVAS_HEIGHT = CANVAS_HEIGHT;`
  plus a small helper `pageCanvasSize(isCover: boolean) => { width, height }` so
  editor + reader compute dims one way.

### Renderer — generalize, never fork
- [src/renderer/PageCanvas.tsx](../../src/renderer/PageCanvas.tsx): add optional
  props `canvasWidth = CANVAS_WIDTH`, `canvasHeight = CANVAS_HEIGHT`; use them for
  the inner div's `width`/`height`. Stays a pure `{ page, scale, renderMode, … }`
  component.
- [src/renderer/useCanvasScale.ts](../../src/renderer/useCanvasScale.ts): add
  optional `canvasWidth = CANVAS_WIDTH`; divide by it.

## Out of scope
- Any editor UI to create or edit the cover (C2).
- Any reader closed-book stage / animation (C3).
- Auto-creating or backfilling covers on existing booklets.

## Manual verification
1. Apply `0004` in Supabase; existing booklets open in the admin and reader and
   render pixel-identically (nothing reads `is_cover` yet).
2. In Supabase Studio, call `add_cover_page(<booklet_id>)`: a row appears with
   `is_cover = true, page_order = 0`, and every previously-existing page's
   `page_order` shifted up by one (still contiguous, no gaps/dupes). Calling it
   again raises (one cover per booklet).
3. Call `reorder_pages` with the cover not first in the array → the cover still
   ends at `page_order = 0`.
4. `npm run lint` + typecheck clean.
