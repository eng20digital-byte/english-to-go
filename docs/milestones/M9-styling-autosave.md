# M9 — Editor: Style Controls & Autosave

## Goal
Admin can fully style a text box (font, size, color, alignment, line-height) and trust that work is saved automatically — and the result is verified pixel-identical between editor and reader.

## Scope
- `src/admin/editor/ElementInspector.tsx` — controls for the selected element's `props`: font picker (from `fonts` table), font size, color, alignment, line-height. Background-image elements get their own minimal inspector (fit: cover/contain).
- `src/admin/editor/useAutosave.ts` — debounced (`src/config/editor.ts` constant, default ~1500ms) save of the current page's element array via the `save_page_elements` RPC; exposes `saveStatus: 'idle' | 'saving' | 'saved' | 'error'`.
- Save-status indicator in the editor UI; manual "Save now" button; save-on-navigate-away (route change / page switch within the booklet) as a safety net.

## Out of scope
No TTS, no quiz embed yet.

## Manual verification
1. Change every style control on a text box (font, size, color, align, line-height) — confirm visual updates are immediate in the editor.
2. Wait for the debounce window — confirm save-status moves `saving` → `saved`, and confirm the change persisted in Supabase Studio.
3. Make a change, immediately navigate to a different page in the same booklet before the debounce fires — confirm the change still saved (navigate-away safety net). As an edge case, also test a change followed by *near-instant* navigation (no pause at all) to check for a race condition between the save and the page switch — confirm the latest change is not silently lost.
4. Open the same booklet in the public reader (`/b/<token>`, published) in a separate browser/incognito tab side by side with the editor — confirm text renders pixel-identical (same font, size, color, alignment, line-height) between the two.
