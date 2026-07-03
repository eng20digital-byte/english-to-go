# Refactor Milestones — Clean & Minimal Architecture

A behavior-preserving refactor to remove duplication and split god-components,
so future changes and additions land in one obvious place. Derived from the
architecture audit of `src/` (July 2026).

**This is not a feature effort — zero user-visible behavior change.** Every
milestone is a pure refactor: the app looks and behaves identically before and
after. If anything renders or behaves differently, that's a bug, not progress.

## Guiding principles (apply to every milestone)

1. **Zero behavior change.** Each page/screen looks and acts exactly as before.
   Verify visually side-by-side against the baseline (R0).
2. **Small, atomic commits.** Each sub-step is one commit with `typecheck` +
   `build` green. Never "extract everything at once."
3. **Never touch `src/renderer/`.** It's already clean and unforked (and so is
   the drag logic in `EditorOverlay` — see R4). All work here is admin/reader
   chrome only.
4. **The admin↔reader boundary is sacred.** No cross-boundary shared components.
   A component used by both moves up to `components/` (neutral), it does not stay
   inside one side's folder.

## Milestones

| # | File | Goal | Risk |
|---|------|------|------|
| R0 | [R0-prep.md](R0-prep.md) | Branch, baseline, delete dead `.gitkeep` files | trivial |
| R1 | [R1-admin-shell.md](R1-admin-shell.md) | Shared admin page shell (kills the biggest duplication) | medium |
| R2 | [R2-split-god-components.md](R2-split-god-components.md) | Split the oversized files into single-responsibility ones | medium |
| R3 | [R3-fix-misplaced-files.md](R3-fix-misplaced-files.md) | Move cross-boundary files to their correct home | low |
| R4 | [R4-registry-resize-handles.md](R4-registry-resize-handles.md) | (Deferred) registry-drive resize handles — do NOT build yet | n/a |
| R5 | [R5-docs-and-cleanup.md](R5-docs-and-cleanup.md) | Update CLAUDE.md folder structure, merge, close out | trivial |

## Target folder structure (end state)

```
src/
  components/                    -- neutral shared UI (admin + reader)
    CreditsPanel.tsx             <- moved from reader/
    Spinner.tsx / StatusBadge.tsx (existing)
  hooks/
    useViewportWidth.ts          <- moved from reader/
  admin/
    shell/                       -- NEW: shared admin chrome
      AdminPageShell.tsx         -- #admin-root + background + centered content
      AdminBackgroundShapes.tsx  -- 6 decorative shapes
      AdminPageHeader.tsx        -- back-link + title + subtitle + icon badge
      EmptyState.tsx             -- dashed empty-state card
      adminControls.ts           -- inputStyle(), submitButtonStyle(), CARD_COLORS, cardShadow()
    booklets/
      BookletCard.tsx
      BookletCardSkeleton.tsx
    LoginPage / DashboardPage / BookletListPage / BookletEditorPage.tsx  (slim)
    fonts/  FontManagerPage.tsx + FontCard.tsx
    editor/
      EditorOverlay.tsx          -- drag/selection logic only
      TextEditOverlay.tsx        <- extracted from EditorOverlay
      ActionBubbleButton.tsx     <- extracted from EditorOverlay
      MediaLibraryPicker.tsx     -- uses the shell
  reader/
    ReaderBookletPage.tsx        -- slim, orchestration only
    ReaderBgShapes.tsx / ReaderLoadingState.tsx / ReaderError.tsx / NavArrow.tsx  <- extracted
    useReaderKeyboard.ts         <- 4 keydown listeners unified
```

## Why this leaves a project that's easy to extend

- A **new admin page** = ~15 lines (`AdminPageShell` + `AdminPageHeader` + body),
  not 250 lines of copy-paste.
- A **design change** (color/shadow/background) = one edit, not five.
- A **new element type** is already easy via the renderer registry; R4 keeps that
  clean once the branching actually grows.
- The **god-components** become <150-line single-responsibility files.
