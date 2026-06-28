-- 0005_booklet_background_color.sql
-- Per-booklet canvas background color. The page canvas background was a fixed
-- constant (CANVAS_BACKGROUND_COLOR = '#ffffff', src/config/canvas.ts); this
-- makes it a stored booklet-level setting so each booklet can pick its own,
-- applied by the SHARED renderer (PageCanvas) in both the editor and the reader.
--
-- A plain scalar column on `booklets`, not page_elements/jsonb: it's one value
-- per booklet (not per element), edited like title/quiz_embed_code. Existing
-- GRANTs on `booklets` already cover the new column; RLS is unchanged (public
-- still only reads published booklets, which is how the reader gets the color).

alter table booklets
  add column background_color text not null default '#59B292';

-- The editor's <input type="color"> only ever emits #rrggbb, so constrain to
-- that shape to reject malformed writes at the DB boundary (mirrors how the
-- status column is constrained via check rather than trusted from the client).
alter table booklets
  add constraint booklets_background_color_hex
  check (background_color ~* '^#[0-9a-f]{6}$');
