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
// knobs. The panel never scrolls: words flow top-to-bottom down a column of
// fixed height, then wrap into a new column, so its width grows with the word
// count. Rows-per-column is derived from PANEL_HEIGHT / CHIP_HEIGHT.
// The panel no longer has a fixed height: in the reader it STRETCHES to fill
// the flexible rail slot between the speaker (top) and the credits (bottom),
// so it can never overlap them at any viewport size (see VocabularyPanel +
// ReaderBookletPage's left-sidebar rail). This value is only the
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

// ── Credits panel (reader left sidebar, pinned to the bottom) ───────────────
// ≈ 2.3× the TTS panel height (56px). SIDEBAR_PANEL_GAP is the fixed gap
// between all three stacked rail panels (speaker → Dictionary → Credits); the
// Dictionary flexes to fill whatever height is left between the top-pinned
// speaker and this bottom-pinned Credits, so the gaps stay constant while the
// middle absorbs viewport changes.
export const CREDITS_PANEL_HEIGHT = 128;
export const SIDEBAR_PANEL_GAP = 20;
// Placeholder — update to the real destination URL before publishing.
export const CREDITS_PANEL_LOGO_URL = 'https://abc-business-automation.netlify.app/';
