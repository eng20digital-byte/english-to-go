# R2 — Split the God-Components

**Goal:** Break the oversized files into single-responsibility files (<150 lines
each where reasonable). Each split is a pure cut-&-paste into a new file plus an
import — **zero logic change.**

Do these after R1, because R1 already removes a large chunk from the two admin
list pages.

## Targets

| File | Lines | Extract to |
|---|---|---|
| `admin/BookletListPage.tsx` | 940 | `admin/booklets/BookletCard.tsx`, `admin/booklets/BookletCardSkeleton.tsx` |
| `admin/fonts/FontManagerPage.tsx` | 534 | `admin/fonts/FontCard.tsx` (the `<li>` specimen row) |
| `admin/editor/EditorOverlay.tsx` | 585 | `admin/editor/TextEditOverlay.tsx`, `admin/editor/ActionBubbleButton.tsx` |
| `reader/ReaderBookletPage.tsx` | 875 | `reader/ReaderBgShapes.tsx`, `reader/ReaderLoadingState.tsx`, `reader/ReaderError.tsx`, `reader/NavArrow.tsx`, `reader/useReaderKeyboard.ts` |

## Steps (one commit per extraction)

### 2.1 — BookletListPage
- Move `BookletCard` → `admin/booklets/BookletCard.tsx`.
- Move `BookletCardSkeleton` → `admin/booklets/BookletCardSkeleton.tsx`.
- (Empty-states already became `shell/EmptyState` in R1.)
- Result: `BookletListPage` is now just the page orchestration (~250 lines).

### 2.2 — FontManagerPage
- Move the specimen `<li>` row → `admin/fonts/FontCard.tsx`.

### 2.3 — EditorOverlay
- Move `TextEditOverlay` → `admin/editor/TextEditOverlay.tsx`.
- Move `ActionBubbleButton` → `admin/editor/ActionBubbleButton.tsx`.
- What remains in `EditorOverlay.tsx` is **only** drag/selection logic
  (`computeGeometry`, `startDrag`, handlers, `getHandles`, `getSelectionRect`).
- Do NOT change the drag math — it is already correct and unified (see R4).

### 2.4 — ReaderBookletPage (most involved — do last)
- Move `BgShapes` → `ReaderBgShapes.tsx`, `LoadingState` →
  `ReaderLoadingState.tsx`, `ReaderError` → `ReaderError.tsx`, `NavArrow` →
  `NavArrow.tsx`.
- Unify the **four** separate `handleKeyDown` effects (currently at lines
  ~266, 287, 303, 324) into one `reader/useReaderKeyboard.ts` hook that takes
  callbacks (`onNext`, `onPrev`, etc.).

## Verification

- `typecheck` + `build` green after each commit.
- Editor: selection, drag, resize (corner + side handles), inline text edit, and
  all keyboard shortcuts behave exactly as before.
- Reader: page navigation (buttons, arrows, swipe), loading/error states, and
  keyboard all behave exactly as before.

## Out of scope

- No behavior or styling changes — purely moving code into new files.
- `BookletEditorPage.tsx` (684 lines) is an orchestrator whose size is justified
  (clipboard ownership + page-op keyboard, per CLAUDE.md). Leave it, or extract
  only the page-clipboard keyboard into a hook if it's a clean lift — optional,
  low priority.
