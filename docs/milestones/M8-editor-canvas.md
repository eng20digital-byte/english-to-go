# M8 — Editor: Canvas, Selection, Drag/Resize, Undo/Redo

## Goal
Admin can open a single page in a true WYSIWYG editor: add/delete text and background-image elements, select one, and move/resize it directly on the canvas — all through the **same shared `PageCanvas` the reader uses** — with in-session undo/redo. Styling controls and persistence come next (M9); this milestone is the canvas interaction mechanics and the element tree that drives them.

## Scope

### Editor route & shell
- Per-page editor route nested under the booklet shell: `/admin/booklets/:bookletId/pages/:pageId`. Selecting a page in `BookletEditorPage` (M7) navigates here; this route mounts the editor for that page. A route param (not local state) is used deliberately so M9's save-on-navigate-away has a real route change to hook.
- The editor area lives inside `BookletEditorPage` (the existing single-booklet shell from M7) and hosts: the add-element toolbar, `EditorCanvas`, and a delete affordance for the selected element. The styling `ElementInspector` panel is M9.

### Shared canvas, never forked (CLAUDE.md rule #1)
- `src/admin/editor/EditorCanvas.tsx` — renders the **same** `PageCanvas` (`renderMode="editor"`) plus a sibling `EditorOverlay`, both inside one viewport container driven by a **single** `useCanvasScale` instance. No duplicate layout/scale math — overlay handles and rendered elements share canvas-space coordinates by construction.
- `src/admin/editor/EditorOverlay.tsx` — selection outline + drag/resize handles for the selected element, drawn in canvas-space and scaled by the same `--scale`. Pointer interactions translate screen-space deltas back into canvas-space px (delta ÷ scale) before dispatching, since element geometry is stored as canvas-space px (CLAUDE.md rule #2).

### Element tree + undo/redo
- `src/admin/editor/useEditorReducer.ts` — `useReducer` owning the page's element array. Actions: `SET_ELEMENTS` (initial load), `ADD_ELEMENT`, `DELETE_ELEMENT`, `UPDATE_ELEMENT` (geometry now; props in M9), `UNDO`, `REDO`. Each mutating action pushes a full element-array snapshot onto an in-memory, capped stack (per CLAUDE.md "Autosave & undo/redo": snapshot stack, per-session, not persisted).
- Selection is **separate UI state**, not part of the undo snapshot — selecting/deselecting must never be an undoable step.

### Add / delete elements
- Toolbar: "Add text box" and "Add background image".
  - New **text box**: inserted at a default position/size with default `TextProps` from the renderer defaults established in M4 (`src/config`), and a default `font_id` resolved per the rule below. `z_index = max(existing) + 1`.
  - New **background image**: opens the `MediaLibraryPicker` from M6 to choose a `media_asset_id`; inserted as a `background_image` element at full-canvas geometry (0,0,1080,1920), `fit: 'cover'`, at the **lowest** z-index (behind text).
- Delete removes the selected element.

### Config
- `src/config/editor.ts` — created here, holding `UNDO_HISTORY_LIMIT` (snapshot cap, ~50). M9 later adds the autosave debounce constant to this same file.
- **Default-font rule for new text boxes:** font_ids are runtime data (generated in M3), so a UUID can't be a config constant. Config holds a `DEFAULT_FONT` **descriptor** (`{ name, weight }`, e.g. Andika New Basic / regular); at text-box creation it's resolved to an actual `font_id` from the loaded `fonts` list, falling back to the first available font if the descriptor isn't found (e.g. no fonts registered yet).

## Out of scope
- No styling controls (`ElementInspector`) and no autosave/persistence yet — both M9. **In M8 the element tree lives only in memory**; changes are not written back to Supabase (verified by reload-loses-changes, which M9 then fixes).
- No rotation handle (the `rotation` field exists in schema but V1 ships no rotate UI).
- No TTS, no quiz, no multi-select (a single selected element in V1).

## Manual verification
1. Seed a page with a couple of elements via Studio, then open it from the booklet shell — the editor route loads and renders them through the same `PageCanvas` the reader uses.
2. Add a text box — it appears in the default font; add a background image via the media picker — it renders full-canvas behind the text with correct `cover` fit.
3. Select an element and drag it — it tracks the pointer with no offset drift at desktop, tablet, and mobile widths (confirming screen→canvas-space conversion uses the live scale). Resize via a handle — dimensions track pointer movement at every width.
4. Resize the browser window live while an element is selected — the overlay handles stay pixel-aligned to the rendered element (single shared scale, no divergence).
5. Delete the selected element — it disappears.
6. Perform a sequence of add/move/resize/delete, then undo repeatedly — each step reverts in order; redo re-applies. Confirm selection changes are NOT in the undo history.
7. Exceed `UNDO_HISTORY_LIMIT` mutations — confirm the oldest snapshots drop and the app stays responsive (no unbounded memory growth).
8. Reload the page — confirm changes are lost (expected: persistence is M9), proving M8 is in-memory and the reducer/undo stack is per-session.
