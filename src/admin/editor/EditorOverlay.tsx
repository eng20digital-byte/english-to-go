import { useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EDITOR_HANDLE_SIZE, EDITOR_MIN_ELEMENT_SIZE } from '@/config/editor';
import type { PageElement } from '@/types/elements';
import type { GeometryChanges } from './useEditorReducer';

// Primary coral color — matches var(--primary) token but available as a
// constant for inline styles (canvas-space coordinates require inline styles).
const PRIMARY = 'hsl(22 90% 62%)';
const PRIMARY_LIGHT = 'hsl(22 90% 62% / 0.08)';

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

interface ActionBubbleButtonProps {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}

function ActionBubbleButton({ label, onClick, children, danger }: ActionBubbleButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: danger ? 'hsl(8 80% 58%)' : 'hsl(25 10% 30%)',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = danger
              ? 'hsl(8 80% 95%)'
              : 'hsl(38 30% 93%)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

interface TextEditOverlayProps {
  element: PageElement & { type: 'text' };
  scale: number;
  onContentChange: (content: string) => void;
  onClose: () => void;
}

function TextEditOverlay({ element, scale, onContentChange, onClose }: TextEditOverlayProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    // Move cursor to end of text
    const len = element.props.content.length;
    textareaRef.current?.setSelectionRange(len, len);
  }, [element.props.content.length]);

  return (
    <textarea
      ref={textareaRef}
      value={element.props.content}
      onChange={(e) => onContentChange(e.target.value)}
      onBlur={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
      dir={element.props.direction === 'auto' ? undefined : element.props.direction}
      style={{
        position: 'absolute',
        left: element.x * scale,
        top: element.y * scale,
        width: element.w * scale,
        height: element.h * scale,
        fontSize: element.props.font_size * scale,
        lineHeight: element.props.line_height,
        color: element.props.color,
        textAlign: element.props.align,
        background: 'hsla(0 0% 100% / 0.85)',
        border: `2px solid ${PRIMARY}`,
        borderRadius: 4,
        padding: 4,
        resize: 'none',
        outline: 'none',
        zIndex: 1000,
        boxSizing: 'border-box',
        fontFamily: 'inherit',
        overflowWrap: 'break-word',
        whiteSpace: 'pre-wrap',
        cursor: 'text',
      }}
    />
  );
}

interface EditorOverlayProps {
  elements: PageElement[];
  scale: number;
  selectedElementId: string | null;
  textEditingId: string | null;
  onSelectElement: (id: string | null) => void;
  onSetTextEditing: (id: string) => void;
  onClearTextEditing: () => void;
  onTextChange: (id: string, content: string) => void;
  onLiveChange: (override: GeometryOverride | null) => void;
  onCommit: (id: string, changes: GeometryChanges) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
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
  textEditingId,
  onSelectElement,
  onSetTextEditing,
  onClearTextEditing,
  onTextChange,
  onLiveChange,
  onCommit,
  onDuplicate,
  onDelete,
  onBringForward,
  onSendBackward,
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
      onLiveChange(null);
    }
  }

  function handleBackgroundPointerDown(event: React.PointerEvent) {
    if (event.target === event.currentTarget) {
      onSelectElement(null);
      onClearTextEditing();
    }
  }

  const selectedElement = elements.find((element) => element.id === selectedElementId) ?? null;
  const textEditingElement =
    textEditingId !== null
      ? (elements.find((e) => e.id === textEditingId && e.type === 'text') as
          | (PageElement & { type: 'text' })
          | undefined) ?? null
      : null;

  // Action bubble sits 44px above the selection's top edge (in screen px),
  // clamped so it never goes above the overlay top.
  const bubbleY = selectedElement
    ? Math.max(0, toScreen(selectedElement.y) - 44)
    : 0;
  const bubbleX = selectedElement ? toScreen(selectedElement.x) : 0;

  return (
    <div
      onPointerDown={handleBackgroundPointerDown}
      style={{ position: 'absolute', inset: 0, isolation: 'isolate' }}
    >
      {/* Transparent hit-areas for each element (drag to move).
          zIndex matches the element's visual z_index so the frontmost
          element's hit-area is always on top — guaranteeing the full
          bounds of every text box are clickable regardless of overlap. */}
      {elements.map((element) => (
        <div
          key={element.id}
          onPointerDown={(event) => {
            event.stopPropagation();
            onSelectElement(element.id);
            if (textEditingId && textEditingId !== element.id) onClearTextEditing();
            if (element.id !== textEditingId) {
              startDrag(event, element, 'move');
            }
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={(event) => {
            event.stopPropagation();
            if (element.type === 'text') {
              onSetTextEditing(element.id);
            }
          }}
          style={{
            position: 'absolute',
            left: toScreen(element.x),
            top: toScreen(element.y),
            width: toScreen(element.w),
            height: toScreen(element.h),
            cursor: element.id === textEditingId ? 'default' : 'move',
            zIndex: element.z_index,
          }}
        />
      ))}

      {/* Selection border + subtle tint overlay */}
      {selectedElement && (
        <div
          style={{
            position: 'absolute',
            left: toScreen(selectedElement.x),
            top: toScreen(selectedElement.y),
            width: toScreen(selectedElement.w),
            height: toScreen(selectedElement.h),
            border: `2px solid ${PRIMARY}`,
            background: PRIMARY_LIGHT,
            pointerEvents: 'none',
            boxSizing: 'border-box',
          }}
        />
      )}

      {/* Resize handles */}
      {selectedElement &&
        RESIZE_HANDLES.map(({ mode, cornerX, cornerY, cursor }) => (
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
              background: 'white',
              border: `2px solid ${PRIMARY}`,
              borderRadius: 2,
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              cursor,
              zIndex: 10,
            }}
          />
        ))}

      {/* Floating action bubble above selected element */}
      {selectedElement && textEditingId !== selectedElement.id && (
        <div
          style={{
            position: 'absolute',
            left: bubbleX,
            top: bubbleY,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            background: 'white',
            border: '1px solid hsl(35 20% 88%)',
            borderRadius: 99,
            padding: '2px 6px',
            boxShadow: 'var(--shadow-float)',
            zIndex: 20,
          }}
        >
          <ActionBubbleButton
            label="Duplicate"
            onClick={() => onDuplicate(selectedElement.id)}
          >
            <Copy style={{ width: 14, height: 14 }} />
          </ActionBubbleButton>

          <div style={{ width: 1, height: 16, background: 'hsl(35 20% 88%)', margin: '0 2px' }} />

          <ActionBubbleButton
            label="Bring forward"
            onClick={() => onBringForward(selectedElement.id)}
          >
            <ChevronUp style={{ width: 14, height: 14 }} />
          </ActionBubbleButton>
          <ActionBubbleButton
            label="Send backward"
            onClick={() => onSendBackward(selectedElement.id)}
          >
            <ChevronDown style={{ width: 14, height: 14 }} />
          </ActionBubbleButton>

          <div style={{ width: 1, height: 16, background: 'hsl(35 20% 88%)', margin: '0 2px' }} />

          <ActionBubbleButton
            label="Delete"
            onClick={() => onDelete(selectedElement.id)}
            danger
          >
            <Trash2 style={{ width: 14, height: 14 }} />
          </ActionBubbleButton>
        </div>
      )}

      {/* In-place text editing textarea overlay */}
      {textEditingElement && (
        <TextEditOverlay
          element={textEditingElement}
          scale={scale}
          onContentChange={(content) => onTextChange(textEditingElement.id, content)}
          onClose={onClearTextEditing}
        />
      )}
    </div>
  );
}
