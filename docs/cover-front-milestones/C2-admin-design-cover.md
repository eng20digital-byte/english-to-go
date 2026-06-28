# C2 — Admin: design the cover page

## Goal
The admin can add a cover to a booklet and design it on a **portrait 960×1080**
canvas using the existing element tools (text / image / vocabulary), with autosave
and thumbnails working — while normal pages still edit at 16:9.

## Background
C1 added the `is_cover` flag, the `add_cover_page` RPC, derived cover dimensions,
and the optional canvas-size props on `PageCanvas`/`useCanvasScale`. The editor
still assumes 1920×1080 everywhere it lays out the canvas or seeds new-element
geometry. This milestone threads the page's derived canvas size (from `is_cover`)
through the editor. Per CLAUDE.md the editor is "chrome" — only sizes change; the
reducer / overlay / measurements are untouched.

## Scope

### Thread the cover size through the editor
The selected `PageRow` (now carrying `is_cover` from C1) is owned by
`BookletEditorPage`. Pass `isCover` (or the derived dims via `pageCanvasSize`)
down: `PageElementEditor` →
[EditorCanvas.tsx](../../src/admin/editor/EditorCanvas.tsx) →
`PageCanvas`/`useCanvasScale`.

- **Aspect-ratio wrappers** use the page's dims instead of hardcoded
  `CANVAS_WIDTH/HEIGHT`:
  [PageElementEditor.tsx:455-460](../../src/admin/editor/PageElementEditor.tsx#L455)
  and [EditorCanvas.tsx:81](../../src/admin/editor/EditorCanvas.tsx#L81). Portrait
  lays out contained by height, centered.
- **New-element default geometry** uses page dims:
  text/vocab centering ([PageElementEditor.tsx:331-359](../../src/admin/editor/PageElementEditor.tsx#L331))
  and the full-bleed background image `w/h`
  ([PageElementEditor.tsx:393-394](../../src/admin/editor/PageElementEditor.tsx#L393)).
- **Thumbnail** ([PageThumbnail.tsx](../../src/admin/editor/PageThumbnail.tsx)):
  portrait dims + scale when `page.is_cover`; pass the cover dims to its
  `PageCanvas`; badge shows "Cover" (mirroring the `is_quiz_page` "Q" badge).

### Pages sidebar + booklet editor
[PagesSidebar.tsx](../../src/admin/editor/PagesSidebar.tsx) /
`BookletEditorPage.tsx`:

- **"Add Cover"** action (alongside "Add Page"), shown **only when no cover
  exists** → new `add_cover_page` mutation (mirror the `add_page` mutation);
  navigate to the new cover page.
- **Cover guards**: the cover row is not draggable and not a valid drop target
  before it (stays pinned first). Its action menu hides Duplicate / Copy / Cut /
  Paste-before — only **Delete** remains. Exclude the cover from the page clipboard
  ops in `BookletEditorPage`. (The C1 `reorder_pages`/index defends order-0
  server-side regardless.)

### No changes needed
The editor reducer, `EditorOverlay`, and `useTextMeasurements` operate purely in
scale-space and do not import `CANVAS_WIDTH/HEIGHT` — drag/resize have no
canvas-bound clamp to adjust. **Confirm with a grep during implementation.**

## Out of scope
- The reader closed-book stage / open animation (C3).
- Letting the admin change the cover's dimensions (always derived).

## Manual verification
1. Open a booklet → **Add Cover**: it appears **first** in the sidebar, portrait,
   with a "Cover" badge; "Add Cover" disappears (can't add a second).
2. Open the cover → the canvas is portrait 960×1080; add text, an image
   (full-bleed fills the portrait page), and a vocabulary block; each lands
   centered/correct. Autosave shows ✓ Saved; reload the page and the content
   persists.
3. Normal pages still edit at 16:9 (regression check).
4. The cover can't be dragged out of first position; its menu shows only Delete.
5. `npm run lint` + typecheck clean.
