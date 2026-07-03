# R3 — Fix Misplaced Files (admin↔reader boundary)

**Goal:** Remove the cross-boundary imports where admin code reaches into
`reader/`. A file used by both sides must live in a neutral home, per the
CLAUDE.md admin/reader boundary rule.

## Current violations

- `admin/DashboardPage.tsx:9` → `import { useViewportWidth } from '@/reader/useViewportWidth'`
- `admin/DashboardPage.tsx:7` and `admin/LoginPage.tsx:6` →
  `import { CreditsPanel } from '@/reader/CreditsPanel'`

## Steps (one commit each)

1. Move `reader/useViewportWidth.ts` → `hooks/useViewportWidth.ts`.
   Update all importers: `DashboardPage`, `CreditsPanel`, `VocabularyPanel`,
   `PageNav`, `ReaderBookletPage`.
2. Move `reader/CreditsPanel.tsx` → `components/CreditsPanel.tsx`.
   Update all importers: `DashboardPage`, `LoginPage`, and any reader usage.

## Do NOT do

- Do **not** merge the reader's `ReaderBgShapes` with the admin
  `AdminBackgroundShapes`. They sit on opposite sides of the admin/reader
  boundary; two separate files is the correct answer here, not duplication to be
  removed. Forcing a shared component across that boundary violates the CLAUDE.md
  scope rule.

## Verification

- `grep` confirms there are no remaining `import ... from '@/reader/...'`
  statements inside `src/admin/`.
- `typecheck` + `build` green.
- Dashboard, Login, Reader, and the editor all behave exactly as before.
