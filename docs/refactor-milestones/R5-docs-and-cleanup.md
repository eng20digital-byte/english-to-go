# R5 — Docs & Close-Out

**Goal:** Bring CLAUDE.md back in sync with the code (it had already drifted
before this refactor), document the new conventions, and merge.

## Steps

1. Update the **"Folder structure"** section in `CLAUDE.md` to reflect the new
   layout, including everything that was already missing before the refactor:
   - `admin/shell/` and its files (from R1).
   - `admin/booklets/`, `admin/fonts/FontCard.tsx`, the extracted editor files,
     and the extracted reader files (from R2).
   - `components/CreditsPanel.tsx`, `hooks/useViewportWidth.ts` (from R3).
   - The reader files that were never documented (`BookCover`, `BookBackCover`,
     `CreditsPanel`, `VocabularyPanel`, `UnavailableBookletPage`, page-flip
     audio/sound, preloaders, etc.).
   - The full `config/` list (11 files) and `hooks/` list.
   - Fix stale extensions: `registry.ts` → `registry.tsx`,
     `useWordSpeech.ts` → `useWordSpeech.tsx`.
   - Remove the documented-but-nonexistent `reader/routes.tsx` line (routing is
     wired in `App.tsx`).
   - Add `VocabularyElement` to the element-types list.

2. Update the **"UI component library — scope boundary"** section to name
   `admin/shell/` as the shared home for admin chrome, and add a one-line
   convention: *"every admin page = `AdminPageShell` + `AdminPageHeader` + body."*

3. Final full-app manual pass against the R0 baseline: Login, Dashboard,
   Booklets list, Font Library, Media Library, Reader, Editor — all identical.

4. Merge `refactor-clean-architecture` → `main`, delete the branch.

## Verification

- `typecheck` + `build` green.
- CLAUDE.md "Folder structure" matches the actual `src/` tree exactly (spot-check
  with a directory listing).
- No behavior differences anywhere versus the R0 baseline.
