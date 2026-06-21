# M3 — Font Pipeline

## Goal
Source TTF/OTF fonts can be converted to WOFF2 and registered for use, and the process is re-runnable as new fonts are added later (not a one-off hand-edited script).

## Scope
- `scripts/convert-fonts.mjs` (Node): scans `fonts/*.{ttf,otf}`, converts each to WOFF2 (e.g. via `wawoff2`), writes output next to a `fonts-built/` (or similar) directory — skips any source file that already has a corresponding up-to-date `.woff2` output (idempotent).
- Run it against the existing 4 Andika New Basic files.
- `src/admin/fonts/FontManagerPage.tsx` — minimal UI: list registered `fonts` rows, upload a `.woff2` file to the `fonts` Storage bucket + insert the matching `fonts` table row (name, weight, storage_path).
- Register the 4 Andika weights through this UI (or directly, documenting which approach was used).
- Confirm `@font-face` loading works: a throwaway test renders Hebrew text in each of the 4 weights.

## Out of scope
No per-text-box font selection UI yet (that's M9) — just proving fonts load and render correctly.

## Manual verification
1. Run `node scripts/convert-fonts.mjs` — confirm 4 `.woff2` files produced.
2. Run it again immediately — confirm it skips all 4 (idempotent, no errors, no re-conversion).
3. In `/admin/fonts`, upload and register all 4 weights.
4. On a test page, render the same Hebrew sentence in all 4 weights via `@font-face` — visually confirm correct regular/bold/italic/bold-italic rendering.
