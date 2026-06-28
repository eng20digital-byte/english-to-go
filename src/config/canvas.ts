import type { TextAlign, TextDirection } from '@/types/elements';

// Fixed virtual canvas size (landscape, 16:9). Element positions are stored
// as canvas-space pixel values against this reference — see CLAUDE.md
// "Fixed virtual canvas, scaled to fit".
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
export const CANVAS_BACKGROUND_COLOR = '#ffffff';

// Front cover canvas: a single portrait page, exactly the right half of a
// 1920×1080 spread (960×1080) — see docs/cover-front-milestones. A cover's
// canvas size is derived from its `is_cover` flag, never stored per page.
export const COVER_CANVAS_WIDTH = CANVAS_WIDTH / 2;
export const COVER_CANVAS_HEIGHT = CANVAS_HEIGHT;

// Single source of truth for a page's canvas dimensions, so the editor and the
// reader compute cover vs. spread dims exactly one way. Both the front cover and
// the back cover share the same portrait 960×1080 canvas — derived from their
// flags, never stored. isBackCover defaults to false so call sites that don't
// yet pass it (or pass only isCover) are safe.
export function pageCanvasSize(isCover: boolean, isBackCover = false): { width: number; height: number } {
  return (isCover || isBackCover)
    ? { width: COVER_CANVAS_WIDTH, height: COVER_CANVAS_HEIGHT }
    : { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
}

// Defaults applied when a new text element is created (wired up by the
// editor in M8/M9) and used as renderer fallbacks.
export const DEFAULT_FONT_SIZE = 48;
export const DEFAULT_TEXT_COLOR = '#1a1a1a';
export const DEFAULT_LINE_HEIGHT = 1.4;
export const DEFAULT_TEXT_ALIGN: TextAlign = 'left';
export const DEFAULT_TEXT_DIRECTION: TextDirection = 'auto';
