# R1 — Shared Admin Page Shell

**Goal:** Remove the single biggest duplication in the codebase — the admin page
"shell" (root wrapper + 6 background shapes + floating header + inputs/buttons +
empty states) that is currently copy-pasted across **five** pages:
`LoginPage`, `DashboardPage`, `BookletListPage`, `FontManagerPage`,
`MediaLibraryPicker`.

**Approach:** build the shared pieces first (with no consumers yet, so nothing
breaks), then migrate one page at a time, verifying each visually before moving
on.

## The duplication being removed

| Duplicated block | Example locations |
|---|---|
| `#admin-root` wrapper (`minHeight:100vh`, `BRAND.green`, padding, font) | `BookletListPage.tsx:583`, `FontManagerPage.tsx:133`, `DashboardPage.tsx:33` |
| 6 decorative background shapes (~55 lines each) | `BookletListPage.tsx:595-649`, `FontManagerPage.tsx:144-198`, `DashboardPage.tsx:50-105` |
| Floating cream header card (back-link + h1 + subtitle + icon badge) | `BookletListPage.tsx:655-723`, `FontManagerPage.tsx:203-270` |
| `CARD_COLORS` cream→yellow→pink palette | `BookletListPage.tsx:54-91`, `FontManagerPage.tsx:11-33` |
| `inputStyle` focus-ring input | `BookletListPage.tsx:568-581`, `FontManagerPage.tsx:35-49` |
| Yellow submit button (hover/active/scale) | `BookletListPage.tsx:764-804`, `FontManagerPage.tsx:378-413` |
| Empty-state cards | `EmptyBooklets`, `EmptyFonts`, `NoMatchingBooklets` |

## Steps

### 1.1 — Style tokens (one commit)
Create `src/admin/shell/adminControls.ts`:
- `CARD_COLORS` — the cream→yellow→pink palette (merged from the two copies).
- `inputStyle(focused, accent?)` — the focus-ring input.
- `submitButtonStyle({ hover, active, pending })` — the yellow submit button.
- `cardShadow(hovered)`, `BTN_BASE`.
- Any raw brand color values belong in `src/config/theme.ts` — reference them,
  don't re-declare here.

### 1.2 — Shell components (one commit each)
- `AdminBackgroundShapes.tsx` — the 6 shapes. Reconcile the near-identical
  per-page positions into one canonical version; add an optional `variant`/
  `accent` prop only if a real difference must survive.
- `AdminPageShell.tsx` — `<div id="admin-root">` + `<AdminBackgroundShapes/>` +
  the centered content container (`maxWidth:900, zIndex:10, margin:0 auto`).
  Props: `children`, and an optional `scroll` flag for the Dashboard's
  stacked-overflow behavior.
- `AdminPageHeader.tsx` — Props: `{ title, subtitle, icon, accent, backTo }`.
  The back-link pill + h1 + subtitle + icon badge.
- `EmptyState.tsx` — Props: `{ icon, title, subtitle, accent, action? }`.
  Unifies `EmptyBooklets`, `EmptyFonts`, and `NoMatchingBooklets` (`action`
  covers the "Clear filters" button).

### 1.3 — Migrate page-by-page (one commit + visual check each)
Replace each page's inline shell with the shared components, in this order:
1. `LoginPage.tsx`
2. `DashboardPage.tsx`
3. `FontManagerPage.tsx`
4. `MediaLibraryPicker.tsx`
5. `BookletListPage.tsx`

## Verification

- After **each** page migration: that page renders pixel-identical to the R0
  baseline (background shapes, header, inputs, buttons, empty states).
- `typecheck` + `build` green after every commit.

## Out of scope

- Do NOT also split `BookletListPage`/`FontManagerPage` into sub-components here
  — that's R2. R1 only swaps the shared shell in. (Empty-states do collapse into
  `EmptyState` here, since that's part of the shell.)
- The reader's own background shapes are a separate concern — not touched here
  (see R3 note).
