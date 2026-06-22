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
}

// Single shared rendering implementation used unmodified by both the editor
// and the reader — see CLAUDE.md "Shared renderer — never fork this". Pure:
// { page, scale, renderMode } in, JSX out. Dispatches per-element by `type`
// via the registry, so a new element type never touches this file.
export function PageCanvas({ page, scale, renderMode }: PageCanvasProps) {
  const sortedElements = [...page.elements].sort((a, b) => a.z_index - b.z_index);

  return (
    <div
      style={{
        position: 'relative',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: CANVAS_BACKGROUND_COLOR,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        overflow: 'hidden',
      }}
    >
      {sortedElements.map((element) => (
        <div
          key={element.id}
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
