// Vocabulary element defaults — applied when a new vocabulary element is
// created (PageElementEditor) and used as renderer fallbacks. Kept here (not
// inline in components) per CLAUDE.md "No magic numbers/hardcoded values in
// components". Mirrors the split used for text (config/canvas.ts +
// config/editor.ts), but a single dedicated file since vocabulary owns a
// self-contained cluster of style knobs.
import type { VocabularyWord } from '@/types/elements';

// Default geometry for a newly added vocabulary element. Not forced to the
// bottom of the page — placed centered like a text box; the admin moves it.
export const NEW_VOCABULARY_ELEMENT_WIDTH = 600;
export const NEW_VOCABULARY_ELEMENT_HEIGHT = 160;

// Seed rows so a fresh element is immediately visible/editable rather than empty.
export const NEW_VOCABULARY_WORDS: VocabularyWord[] = [
  { english: 'giant', hebrew: 'ענק' },
  { english: 'dwarf', hebrew: 'גמד' },
];

// A new vocabulary element shows its bubbles on the page by default; the admin
// can toggle this off (ElementInspector) to keep the words panel-only.
export const DEFAULT_VOCABULARY_SHOW_ON_PAGE = true;

// Default chip/bubble styling — educational vocabulary card look.
export const DEFAULT_VOCABULARY_FONT_SIZE = 24;
export const DEFAULT_VOCABULARY_TEXT_COLOR = '#1a1a1a';
export const DEFAULT_VOCABULARY_BUBBLE_BACKGROUND = '#F1EDB8';
export const DEFAULT_VOCABULARY_BUBBLE_BORDER_COLOR = '#999999';
export const DEFAULT_VOCABULARY_BUBBLE_BORDER_WIDTH = 1;
export const DEFAULT_VOCABULARY_BUBBLE_BORDER_RADIUS = 999; // pill
export const DEFAULT_VOCABULARY_BUBBLE_PADDING_X = 16;
export const DEFAULT_VOCABULARY_BUBBLE_PADDING_Y = 8;
export const DEFAULT_VOCABULARY_BUBBLE_SPACING = 8;

// Separator drawn between the English word and its Hebrew translation.
export const VOCABULARY_WORD_SEPARATOR = '-';

// Bounds for the inspector's numeric bubble-style controls.
export const VOCABULARY_BORDER_WIDTH_MAX = 20;
export const VOCABULARY_BORDER_RADIUS_MAX = 999;
export const VOCABULARY_PADDING_MAX = 80;
export const VOCABULARY_SPACING_MAX = 80;

// ── Global VocabularyPanel (reader chrome) ──────────────────────────────────
// The reader's always-available, book-wide vocabulary list — a separate piece
// of *chrome* (under #reader-root) from the per-page VocabularyElement above,
// so these are fixed chrome-space px independent of the canvas-space bubble
// knobs. Words flow top-to-bottom down a FIXED-WIDTH column, then wrap into the
// next column, so the panel's width grows with the word count — but now bounded
// by the viewport (see the width knobs below): the column count is capped to
// what fits the available width, and only if the words still don't fit does the
// columns body scroll vertically inside its slot. Rows-per-column is derived
// from the measured slot height / CHIP_HEIGHT.
// The panel no longer has a fixed height: in the reader it STRETCHES to fill
// the flexible rail slot between the speaker (top) and the credits (bottom),
// so it can never overlap them at any viewport size (see VocabularyPanel +
// ReaderBookletPage's right-sidebar rail). This value is only the
// pre-measurement fallback used for the very first paint before the slot
// height is measured.
export const VOCABULARY_PANEL_HEIGHT = 450; // fallback height; live height is the measured slot
export const VOCABULARY_PANEL_PADDING = 16;
export const VOCABULARY_PANEL_HEADER_HEIGHT = 40;
export const VOCABULARY_PANEL_CHIP_HEIGHT = 38; // chip box height; drives rows-per-column
export const VOCABULARY_PANEL_CHIP_FONT_SIZE = 15;
export const VOCABULARY_PANEL_ROW_GAP = 8; // vertical gap between chips in a column
export const VOCABULARY_PANEL_COLUMN_GAP = 10; // horizontal gap between columns
export const VOCABULARY_PANEL_HANDLE_WIDTH = 44; // peeking tab when collapsed
export const VOCABULARY_PANEL_SLIDE_MS = 400;

// ── Which viewport edge a sliding panel is docked to ────────────────────────
// The reader's rail sits at the RIGHT edge; the admin shell still docks the
// Credits panel bottom-LEFT. The two are exact mirrors, so rather than fork the
// styling, the side-dependent bits are derived here: the drop shadow's x-offset
// points AWAY from the docked edge, and the handle tab rounds only its two
// corners facing INTO the page (the body is flush against the edge).
export type SidebarSide = 'left' | 'right';

export const sidebarPanelShadow = (side: SidebarSide) =>
  side === 'right' ? '-2px 4px 18px rgba(0,0,0,0.22)' : '2px 4px 18px rgba(0,0,0,0.22)';

export const SIDEBAR_HANDLE_RADIUS = 16;
export const sidebarHandleRadius = (side: SidebarSide) =>
  side === 'right'
    ? { borderTopLeftRadius: SIDEBAR_HANDLE_RADIUS, borderBottomLeftRadius: SIDEBAR_HANDLE_RADIUS }
    : { borderTopRightRadius: SIDEBAR_HANDLE_RADIUS, borderBottomRightRadius: SIDEBAR_HANDLE_RADIUS };

// ── Responsive width behaviour ──────────────────────────────────────────────
// Columns hug their content (each as wide as its widest chip) so every word is
// shown in full — chips never wrap or clip. The panel therefore widens with the
// word count, but is bounded by a cap so it can't cover the book / run off the
// screen: on large screens the absolute MAX keeps it compact; on small screens
// it may instead use a larger FRACTION of the viewport (RATIO) — so, as a share
// of the screen, the panel opens *wider* on phones than on desktop. RESERVE
// keeps room to the right of the body for the handle tab + breathing space so
// panel + handle ≤ viewport width. If content still exceeds the cap, the columns
// scroll horizontally inside the body (full words preserved).
export const VOCABULARY_PANEL_MAX_WIDTH = 760; // absolute cap on large screens
export const VOCABULARY_PANEL_VIEWPORT_WIDTH_RATIO = 0.9; // may fill up to 90% of a small viewport
export const VOCABULARY_PANEL_VIEWPORT_RESERVE = VOCABULARY_PANEL_HANDLE_WIDTH + 24;
// Per-column MINIMUM width. Columns hug their content (so full words always show)
// but never sit narrower than this — it also drives how many columns fit the
// width cap: maxColumns = floor(availWidth / COLUMN_MIN_WIDTH). Columns fill the
// slot height first; once the word count needs more rows than fit AND the width
// cap is reached, the panel scrolls VERTICALLY instead of clipping any word.
export const VOCABULARY_PANEL_COLUMN_MIN_WIDTH = 176;

// ── Compact metrics below the mobile breakpoint ─────────────────────────────
// Smaller chips + narrower min-column on phones: more rows per column in a short
// slot and more columns per unit width, so the same word list needs less scroll.
export const VOCABULARY_PANEL_MOBILE_BREAKPOINT = 640; // px; matches READER_MOBILE_BREAKPOINT
export const VOCABULARY_PANEL_CHIP_HEIGHT_MOBILE = 32;
export const VOCABULARY_PANEL_CHIP_FONT_SIZE_MOBILE = 13;
export const VOCABULARY_PANEL_COLUMN_MIN_WIDTH_MOBILE = 150;

// ── Credits panel (reader right sidebar, pinned to the bottom) ──────────────
// ≈ 2.3× the TTS panel height (56px). SIDEBAR_PANEL_GAP is the fixed gap
// between all three stacked rail panels (speaker → Dictionary → Credits); the
// Dictionary flexes to fill whatever height is left between the top-pinned
// speaker and this bottom-pinned Credits, so the gaps stay constant while the
// middle absorbs viewport changes.
export const CREDITS_PANEL_HEIGHT = 128;
export const SIDEBAR_PANEL_GAP = 20;
// Placeholder — update to the real destination URL before publishing.
export const CREDITS_PANEL_LOGO_URL = 'https://abc-business-automation.netlify.app/';
// Logo banner + label sizing, factored out of the component (no magic numbers).
export const CREDITS_PANEL_LOGO_HEIGHT = 84;
export const CREDITS_PANEL_LABEL_FONT_SIZE = 14;
// Compact variant — the whole credits card (height, banner image, label) shrinks
// ONLY on a SHORT screen (low viewport height), where the fixed-height credits
// would otherwise eat the vertical rail. Regular/large screens are untouched.
// The trigger is height-only (NOT width): a large monitor stays original even in
// a short window only if it's below this threshold, so keep it low enough that
// normal laptops/desktops never hit it. Compact height is 60% of regular.
export const CREDITS_PANEL_SHORT_SCREEN_HEIGHT = 600; // px; below this, credits go compact
export const CREDITS_PANEL_HEIGHT_MOBILE = Math.round(CREDITS_PANEL_HEIGHT * 0.6); // ≈ 77
export const CREDITS_PANEL_LOGO_HEIGHT_MOBILE = 46;
export const CREDITS_PANEL_LABEL_FONT_SIZE_MOBILE = 11;
