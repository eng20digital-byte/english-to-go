import type { TextAlign, TextDirection } from '@/types/elements';

// Fixed virtual canvas size (landscape, 16:9). Element positions are stored
// as canvas-space pixel values against this reference — see CLAUDE.md
// "Fixed virtual canvas, scaled to fit".
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
export const CANVAS_BACKGROUND_COLOR = '#ffffff';

// Defaults applied when a new text element is created (wired up by the
// editor in M8/M9) and used as renderer fallbacks.
export const DEFAULT_FONT_SIZE = 48;
export const DEFAULT_TEXT_COLOR = '#1a1a1a';
export const DEFAULT_LINE_HEIGHT = 1.4;
export const DEFAULT_TEXT_ALIGN: TextAlign = 'left';
export const DEFAULT_TEXT_DIRECTION: TextDirection = 'auto';
