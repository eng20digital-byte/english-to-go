import { CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_BACKGROUND_COLOR } from '@/config/canvas';
import type { PageElement } from '@/types/elements';
import { renderElement, type RenderMode } from './elements/registry';

export interface PageCanvasPage {
  id: string;
  elements: PageElement[];
}

interface PageCanvasProps {
  page: PageCanvasPage;
  scale: number;
  renderMode: RenderMode;
  // Per-page canvas size — defaults to the full 1920×1080 spread, overridden to
  // the portrait cover dims for an is_cover page (see config/canvas.ts
  // pageCanvasSize). Threaded through here rather than forked so the cover
  // reuses this exact renderer (CLAUDE.md "Shared renderer — never fork this").
  canvasWidth?: number;
  canvasHeight?: number;
}

// Single shared rendering implementation used unmodified by both the editor
// and the reader — see CLAUDE.md "Shared renderer — never fork this". Pure:
// { page, scale, renderMode, canvasWidth, canvasHeight } in, JSX out.
// Dispatches per-element by `type` via the registry, so a new element type
// never touches this file.
export function PageCanvas({
  page,
  scale,
  renderMode,
  canvasWidth = CANVAS_WIDTH,
  canvasHeight = CANVAS_HEIGHT,
}: PageCanvasProps) {
  const sortedElements = [...page.elements].sort((a, b) => a.z_index - b.z_index);

  return (
    <div
      style={{
        position: 'relative',
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: CANVAS_BACKGROUND_COLOR,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        overflow: 'hidden',
      }}
    >
      {sortedElements.map((element) => (
        <div
          key={element.id}
          // Stable, mode-agnostic identifiers so the editor overlay can locate
          // each rendered node (e.g. to measure a text element's real glyph
          // bounds for its selection box — see useTextMeasurements). Harmless,
          // inert markers in the reader; they don't change rendering, so this
          // stays a pure { page, scale, renderMode } component (CLAUDE.md #1).
          data-element-id={element.id}
          data-element-type={element.type}
          style={{
            position: 'absolute',
            left: element.x,
            top: element.y,
            width: element.w,
            height: element.h,
            transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
          }}
        >
          {renderElement(element, renderMode)}
        </div>
      ))}
    </div>
  );
}
