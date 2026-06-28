# B2 — Admin: design the back cover page

## Goal
The admin can add a back cover to a booklet and design it on a **portrait
960×1080** canvas using the existing element tools, with autosave and thumbnails
working — while all other pages still edit at their own sizes. Mirrors C2
exactly, substituting `is_back_cover` for `is_cover` and "Back" for "Cover".

## Background
B1 added `is_back_cover`, `add_back_cover_page`, and extended `pageCanvasSize`.
The editor still needs to be told that the currently-selected page is a back
cover so it can lay out the canvas at portrait dims, set the thumbnail aspect
ratio, and apply the same guards (no drag, no clipboard ops) that the front
cover has. All of this is "chrome" — the reducer, overlay, and measurements are
untouched.

## Scope

### Thread the back cover size through the editor

The selected `PageRow` (now carrying `is_back_cover` from B1) is owned by
`BookletEditorPage`. Pass `isBackCover` (or the derived dims via
`pageCanvasSize`) down: `PageElementEditor` → `EditorCanvas` →
`PageCanvas` / `useCanvasScale`.

- **`pageCanvasSize` call sites** — update every place that currently passes
  `page.is_cover` to also pass `page.is_back_cover`:
  [PageElementEditor.tsx](../../src/admin/editor/PageElementEditor.tsx),
  [EditorCanvas.tsx](../../src/admin/editor/EditorCanvas.tsx). The second
  argument defaults to `false` so no behaviour change for non-back-cover pages.
- **Aspect-ratio wrappers and canvas dims** already flow from `pageCanvasSize`
  output — no extra changes needed beyond the call-site update above.
- **New-element default geometry** (text/vocab centering, full-bleed background
  `w/h`) reads the canvas dims from `pageCanvasSize` — confirms correct for
  portrait; the B1 `pageCanvasSize` change is sufficient.

### Thumbnail — `src/admin/editor/PageThumbnail.tsx`

- Pass `page.is_cover || page.is_back_cover` to `thumbnailMetrics` (or update
  the call to `pageCanvasSize` inside it to include `page.is_back_cover`).
- Badge logic:
  ```typescript
  page.is_cover      ? 'Cover'
  page.is_back_cover ? 'Back'
                     : pageIndex + 1
  ```
  (Keep the existing `is_quiz_page && ' Q'` suffix for the quiz badge.)
- Portrait thumbnail renders at the correct 960×1080 aspect, distinct from
  1920×1080 landscape spreads.

### Pages sidebar + booklet editor

[PagesSidebar.tsx](../../src/admin/editor/PagesSidebar.tsx) /
[BookletEditorPage.tsx](../../src/admin/BookletEditorPage.tsx):

- **"Add Back Cover"** action (alongside "Add Page" and "Add Cover"), shown
  **only when no back cover exists**:
  - `hasBackCover = pages.some(p => p.is_back_cover)` in `BookletEditorPage`;
    passed to `PagesSidebar` as a prop.
  - New `useAddBackCoverPageMutation(bookletId)` hook in
    [usePagesQuery.ts](../../src/hooks/usePagesQuery.ts) — calls
    `add_back_cover_page`, invalidates the booklet query on success; mirrors
    `useAddCoverPageMutation` exactly.
  - On success: navigate to the new back cover page (same UX as "Add Cover").
- **Back cover guards** — extend every existing `is_cover` guard to also include
  `is_back_cover`:
  - `draggable={!page.is_cover && !page.is_back_cover}`
  - Drop-target early return: `if (pages[index]?.is_cover || pages[index]?.is_back_cover) return`
  - Action menu: hide Duplicate / Copy / Cut / Paste-after for the back cover
    page — only **Delete** remains (same as the front cover).
- **Keyboard shortcuts** in `BookletEditorPage` — extend the Ctrl+Shift+C/X/V/D
  guards:
  ```typescript
  if (e.code === 'KeyC' && currentPage && !currentPage.is_cover && !currentPage.is_back_cover)
  ```
  Apply the same `!currentPage.is_back_cover` to X, V, D. Delete (`Ctrl+Shift+Delete`)
  already applies to all pages including covers — leave it.

### No changes needed
The editor reducer, `EditorOverlay`, `useTextMeasurements`, and
`useEditorReducer` operate purely in scale-space and do not import
`CANVAS_WIDTH/HEIGHT`. Confirm with a grep during implementation.

## Out of scope
- The reader back-cover stage / animation (B3).
- Letting the admin change the back cover's dimensions (always derived, same as
  the front cover).

## Manual verification
1. Open a booklet → **Add Back Cover**: it appears **last** in the sidebar,
   portrait, with a "Back" badge; "Add Back Cover" disappears (can't add a
   second).
2. Open the back cover → the canvas is portrait 960×1080; add text, an image
   (full-bleed fills the portrait page), and a vocabulary block; each lands
   centered/correct. Autosave shows ✓ Saved; reload and the content persists.
3. **All other pages** still edit at their own sizes — 1920×1080 spreads (16:9),
   front cover at 960×1080 portrait (regression check).
4. The back cover **cannot be dragged** out of last position; its action menu
   shows **only Delete**; Ctrl+Shift+C/X/V/D do nothing when it is selected.
5. A booklet with **both** a front cover and a back cover: front cover is first
   (portrait, "Cover" badge), back cover is last (portrait, "Back" badge),
   content pages in between are landscape.
6. **Quiz page** behaviour: if a booklet has a quiz page (second-to-last when a
   back cover exists), the "Q" badge and `is_quiz_page` status are unaffected.
7. `npm run lint` + typecheck clean.
