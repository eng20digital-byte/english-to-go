// Editor-only constants (M8 canvas/undo mechanics, M9 styling/autosave).
import type { FontWeight } from '@/config/fonts';

// Snapshot cap for the in-memory undo/redo stack (per CLAUDE.md "Autosave &
// undo/redo": capped size, per editing session only, not persisted).
export const UNDO_HISTORY_LIMIT = 50;

// font_ids are runtime data (generated in M3), so a UUID can't be a config
// constant. This descriptor is resolved to an actual font_id from the loaded
// `fonts` list at text-box creation time, falling back to the first
// available font if the descriptor isn't found (e.g. no fonts registered yet).
export const DEFAULT_FONT: { name: string; weight: FontWeight } = {
  name: 'Andika New Basic',
  weight: 'regular',
};

// Default geometry/content for a newly added text box.
export const NEW_TEXT_ELEMENT_WIDTH = 600;
export const NEW_TEXT_ELEMENT_HEIGHT = 200;
export const NEW_TEXT_ELEMENT_CONTENT = 'text for example';

// Floor on element width/height while resizing, so a handle drag can't
// collapse an element to zero (or negative) size.
export const EDITOR_MIN_ELEMENT_SIZE = 40;

// Selection chrome — fixed screen-space size/color, independent of canvas scale.
export const EDITOR_HANDLE_SIZE = 16;
export const EDITOR_SELECTION_COLOR = '#2563eb';

// ── Text selection measurement ──────────────────────────────────────────────
// A text element's selection box is derived from the *actually rendered* glyph
// bounds (a DOM Range over the text node), not the stored frame w/h — so it
// hugs the text on all sides and reflects font / size / weight / line breaks /
// line height / alignment / wrapping exactly as painted (see
// useTextMeasurements). These tune that measurement:

// Sub-pixel threshold (canvas px) below which two measured boxes count as
// equal — prevents re-render churn — and below which a box is degenerate.
export const TEXT_MEASURE_EPSILON = 0.5;
// Caps how many animation frames we keep re-measuring after a text/style change
// to catch async web-font loads (the `fonts` table loads over the network, so
// the first paint may use a fallback face). Re-measuring stops early once the
// result stabilizes.
export const TEXT_MEASURE_MAX_ATTEMPTS = 60;
// Fallback selectable width (canvas px) for an empty text box, which has no
// rendered glyphs to measure.
export const TEXT_EMPTY_MIN_WIDTH = 16;

// Caps how wide the editor canvas grows on large desktop viewports. The center
// column takes remaining space after the sidebar, so this cap rarely triggers
// except on very wide monitors — mirroring the intent of the reader's READER_MAX_WIDTH.
export const EDITOR_CANVAS_MAX_WIDTH = 1200;

// Debounce window for autosaving the element array via save_page_elements
// (CLAUDE.md "Autosave & undo/redo").
export const AUTOSAVE_DEBOUNCE_MS = 1500;

// Bounds for the ElementInspector's numeric style controls.
export const INSPECTOR_FONT_SIZE_MIN = 8;
export const INSPECTOR_FONT_SIZE_MAX = 400;
export const INSPECTOR_LINE_HEIGHT_MIN = 0.5;
export const INSPECTOR_LINE_HEIGHT_MAX = 4;
export const INSPECTOR_LINE_HEIGHT_STEP = 0.1;
