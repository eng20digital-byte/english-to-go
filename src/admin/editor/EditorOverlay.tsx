import { useRef } from 'react';
import {
  EDITOR_HANDLE_SIZE,
  EDITOR_MIN_ELEMENT_SIZE,
  EDITOR_SELECTION_COLOR,
} from '@/config/editor';
import type { PageElement } from '@/types/elements';
import type { GeometryChanges } from './useEditorReducer';

export interface GeometryOverride {
  id: string;
  changes: GeometryChanges;
}

type DragMode = 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se';

interface DragState {
  id: string;
  mode: DragMode;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startGeometry: GeometryChanges;
  moved: boolean;
}

interface ResizeHandleDef {
  mode: Extract<DragMode, `resize-${string}`>;
  // Fraction of the element's width/height where this handle sits (0 = left/top edge, 1 = right/bottom edge).
  cornerX: 0 | 1;
  cornerY: 0 | 1;
  cursor: string;
}

const RESIZE_HANDLES: ResizeHandleDef[] = [
  { mode: 'resize-nw', cornerX: 0, cornerY: 0, cursor: 'nwse-resize' },
  { mode: 'resize-ne', cornerX: 1, cornerY: 0, cursor: 'nesw-resize' },
  { mode: 'resize-sw', cornerX: 0, cornerY: 1, cursor: 'nesw-resize' },
  { mode: 'resize-se', cornerX: 1, cornerY: 1, cursor: 'nwse-resize' },
];

function computeGeometry(
  mode: DragMode,
  start: GeometryChanges,
  dx: number,
  dy: number,
): GeometryChanges {
  if (mode === 'move') {
    return { x: start.x + dx, y: start.y + dy, w: start.w, h: start.h };
  }

  let { x, y, w, h } = start;
  if (mode === 'resize-se') {
    w = start.w + dx;
    h = start.h + dy;
  } else if (mode === 'resize-sw') {
    x = start.x + dx;
    w = start.w - dx;
    h = start.h + dy;
  } else if (mode === 'resize-ne') {
    y = start.y + dy;
    w = start.w + dx;
    h = start.h - dy;
  } else if (mode === 'resize-nw') {
    x = start.x + dx;
    y = start.y + dy;
    w = start.w - dx;
    h = start.h - dy;
  }

  return { x, y, w: Math.max(EDITOR_MIN_ELEMENT_SIZE, w), h: Math.max(EDITOR_MIN_ELEMENT_SIZE, h) };
}

interface EditorOverlayProps {
  elements: PageElement[];
  scale: number;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onLiveChange: (override: GeometryOverride | null) => void;
  onCommit: (id: string, changes: GeometryChanges) => void;
}

// Drawn in canvas-space (each coordinate multiplied by the same `scale`
// PageCanvas uses for its CSS transform), so hit-boxes and handles stay
// pixel-aligned to the rendered elements at every viewport width — per
// CLAUDE.md rule #1, this is the only place pointer/selection logic lives;
// PageCanvas itself is never touched.
export function EditorOverlay({
  elements,
  scale,
  selectedElementId,
  onSelectElement,
  onLiveChange,
  onCommit,
}: EditorOverlayProps) {
  const dragStateRef = useRef<DragState | null>(null);

  function toScreen(value: number): number {
    return value * scale;
  }

  function startDrag(event: React.PointerEvent, element: PageElement, mode: DragMode) {
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    dragStateRef.current = {
      id: element.id,
      mode,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startGeometry: { x: element.x, y: element.y, w: element.w, h: element.h },
      moved: false,
    };
  }

  function handlePointerMove(event: React.PointerEvent) {
    const drag = dragStateRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;

    const dx = (event.clientX - drag.startClientX) / scale;
    const dy = (event.clientY - drag.startClientY) / scale;
    if (dx !== 0 || dy !== 0) drag.moved = true;

    onLiveChange({ id: drag.id, changes: computeGeometry(drag.mode, drag.startGeometry, dx, dy) });
  }

  function handlePointerUp(event: React.PointerEvent) {
    const drag = dragStateRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    dragStateRef.current = null;

    if (drag.moved) {
      const dx = (event.clientX - drag.startClientX) / scale;
      const dy = (event.clientY - drag.startClientY) / scale;
      onCommit(drag.id, computeGeometry(drag.mode, drag.startGeometry, dx, dy));
    } else {
      // A plain click with no movement: nothing actually changed, so don't
      // push a no-op snapshot onto the undo stack — just clear the preview.
      onLiveChange(null);
    }
  }

  function handleBackgroundPointerDown(event: React.PointerEvent) {
    if (event.target === event.currentTarget) {
      onSelectElement(null);
    }
  }

  const selectedElement = elements.find((element) => element.id === selectedElementId) ?? null;

  return (
    <div onPointerDown={handleBackgroundPointerDown} style={{ position: 'absolute', inset: 0 }}>
      {elements.map((element) => (
        <div
          key={element.id}
          onPointerDown={(event) => {
            event.stopPropagation();
            onSelectElement(element.id);
            startDrag(event, element, 'move');
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            position: 'absolute',
            left: toScreen(element.x),
            top: toScreen(element.y),
            width: toScreen(element.w),
            height: toScreen(element.h),
            cursor: 'move',
          }}
        />
      ))}

      {selectedElement && (
        <>
          <div
            style={{
              position: 'absolute',
              left: toScreen(selectedElement.x),
              top: toScreen(selectedElement.y),
              width: toScreen(selectedElement.w),
              height: toScreen(selectedElement.h),
              border: `2px solid ${EDITOR_SELECTION_COLOR}`,
              pointerEvents: 'none',
            }}
          />
          {RESIZE_HANDLES.map(({ mode, cornerX, cornerY, cursor }) => (
            <div
              key={mode}
              onPointerDown={(event) => {
                event.stopPropagation();
                startDrag(event, selectedElement, mode);
              }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              style={{
                position: 'absolute',
                left:
                  toScreen(selectedElement.x) +
                  toScreen(selectedElement.w) * cornerX -
                  EDITOR_HANDLE_SIZE / 2,
                top:
                  toScreen(selectedElement.y) +
                  toScreen(selectedElement.h) * cornerY -
                  EDITOR_HANDLE_SIZE / 2,
                width: EDITOR_HANDLE_SIZE,
                height: EDITOR_HANDLE_SIZE,
                backgroundColor: EDITOR_SELECTION_COLOR,
                border: '1px solid white',
                borderRadius: 2,
                cursor,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
