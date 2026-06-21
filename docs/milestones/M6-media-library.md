# M6 — Media Library

## Goal
Admin can upload new images and reuse existing ones across booklets, with deletion safely blocked while an image is in use.

## Scope
- `src/admin/editor/MediaLibraryPicker.tsx` — grid of existing `media_assets` (thumbnail, file name), "upload new" flow (file input → upload to `media` Storage bucket → insert `media_assets` row with `width`/`height` read from the image).
- Delete action wired to the `delete_media_asset` RPC from M1; surfaces the RPC's "in use" error as a clear admin-facing message (e.g. "Can't delete — used in N booklet(s)").
- This is a standalone admin screen/route in M6 (not yet wired into the page editor, which comes in M8) — verify it independently first.

## Out of scope
No page-element integration yet — that's M8, where this picker gets reused to set a text page's background image.

## Manual verification
1. Upload a new image — confirm it appears in the grid and the file lands in the `media` Storage bucket.
2. Attempt to delete an unused image — succeeds, disappears from the grid and bucket.
3. Manually create a `page_elements` row referencing an image's `media_asset_id` (via Studio, since the editor doesn't exist yet), then attempt to delete that image from the UI — confirm it's blocked with a clear message.
4. Remove the referencing row, retry delete — succeeds.

## Scope addition
- Before upload: client-side resize/compress images to a max dimension
  matching the canvas width (1080px), and compress to a reasonable quality
  (e.g. JPEG/WebP ~80% quality) before sending to Storage. Target ~200–400KB
  per image. This matters for staying within Supabase free-tier storage (1GB)
  and bandwidth (5GB/month egress) limits — see `CLAUDE.md` deployment notes.
- Store the *compressed* dimensions in `media_assets.width`/`height` (not the
  original upload's dimensions).

## Manual verification addition
5. Upload a large source image (e.g. 4–5MB from a phone camera) — confirm
   the file that actually lands in the `media` Storage bucket is significantly
   smaller (verify in Supabase Studio's Storage browser) and still looks
   visually acceptable on the canvas.