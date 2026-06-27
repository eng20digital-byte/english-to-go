import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EDITOR_HANDLE_SIZE, EDITOR_MIN_ELEMENT_SIZE } from '@/config/editor';
import type { PageElement } from '@/types/elements';
import type { GeometryChanges } from './useEditorReducer';
import type { TextContentBox } from './useTextMeasurements';

// Primary coral color — matches var(--primary) token but available as a
// constant for inline styles (canvas-space coordinates require inline styles).
const PRIMARY = 'hsl(22 90% 62%)';
const PRIMARY_LIGHT = 'hsl(22 90% 62% / 0.08)';

export interface GeometryOverride {
  id: string;
  changes: GeometryChanges;
}

// Corner modes resize free-form elements (images/vocabulary). The two side
// modes (`resize-w`/`resize-e`) are text-only: a text box auto-fits its height
// to the rendered lines, so its only meaningful resize is the wrapping width.
type DragMode =
  | 'move'
  | 'resize-nw'
  | 'resize-ne'
  | 'resize-sw'
  | 'resize-se'
  | 'resize-w'
  | 'resize-e';

// A canvas-space rectangle. For text this is the measured glyph box; for every
// other element it's just the stored x/y/w/h frame.
interface SelectionRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// The selection rect a text element should show: its measured glyph box,
// positioned by adding the element's live x/y to the wrapper-relative offsets.
// Non-text elements (and text not yet measured) fall back to the stored frame,
// preserving the original behavior exactly.
function getSelectionRect(
  element: PageElement,
  measurements: Map<string, TextContentBox>,
): SelectionRect {
  if (element.type === 'text') {
    const box = measurements.get(element.id);
    if (box) {
      return {
        x: element.x + box.offsetX,
        y: element.y + box.offsetY,
        w: box.width,
        h: box.height,
      };
    }
  }
  return { x: element.x, y: element.y, w: element.w, h: element.h };
}

interface DragState {
  id: string;
  mode: DragMode;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startGeometry: GeometryChanges;
  moved: boolean;
}

interface CornerHandleDef {
  mode: Extract<DragMode, `resize-n${string}` | `resize-s${string}`>;
  cornerX: 0 | 1;
  cornerY: 0 | 1;
  cursor: string;
}

const CORNER_HANDLES: CornerHandleDef[] = [
  { mode: 'resize-nw', cornerX: 0, cornerY: 0, cursor: 'nwse-resize' },
  { mode: 'resize-ne', cornerX: 1, cornerY: 0, cursor: 'nesw-resize' },
  { mode: 'resize-sw', cornerX: 0, cornerY: 1, cursor: 'nesw-resize' },
  { mode: 'resize-se', cornerX: 1, cornerY: 1, cursor: 'nwse-resize' },
];

// Text boxes get two mid-height side handles (left/right) instead of corners,
// because their height auto-fits the rendered text — only the wrapping width is
// adjustable. `edge` is the fraction of the selection width the handle sits at.
interface SideHandleDef {
  mode: Extract<DragMode, 'resize-w' | 'resize-e'>;
  edge: 0 | 1;
  cursor: string;
}

const SIDE_HANDLES: SideHandleDef[] = [
  { mode: 'resize-w', edge: 0, cursor: 'ew-resize' },
  { mode: 'resize-e', edge: 1, cursor: 'ew-resize' },
];

interface PositionedHandle {
  mode: Extract<DragMode, `resize-${string}`>;
  // Center point in canvas-space px.
  cx: number;
  cy: number;
  cursor: string;
}

// Resize handles placed on the element's selection rect: side handles for text
// (width-only), corner handles for everything else.
function getHandles(element: PageElement, rect: SelectionRect): PositionedHandle[] {
  if (element.type === 'text') {
    return SIDE_HANDLES.map(({ mode, edge, cursor }) => ({
      mode,
      cx: rect.x + rect.w * edge,
      cy: rect.y + rect.h / 2,
      cursor,
    }));
  }
  return CORNER_HANDLES.map(({ mode, cornerX, cornerY, cursor }) => ({
    mode,
    cx: rect.x + rect.w * cornerX,
    cy: rect.y + rect.h * cornerY,
    cursor,
  }));
}

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
  } else if (mode === 'resize-e') {
    // Text wrapping-width handle: grow/shrink from the frame's left edge.
    w = start.w + dx;
  } else if (mode === 'resize-w') {
    // Text wrapping-width handle: move the frame's left edge, keep the right.
    x = start.x + dx;
    w = start.w - dx;
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
  const { content, font_id, font_size, color, align, line_height, direction } = element.props;
  // Same @font-face family the renderer uses (registered globally on
  // document.fonts), so the editing text wraps and looks exactly like the
  // on-canvas text rather than the admin chrome's system font.
  const familyName = `font-${font_id}`;

  // Focus and drop the caret at the end exactly once, when editing begins.
  // Re-running this on every content change (the previous behavior, keyed on
  // content.length) is what forced the caret back to the end after each
  // keystroke — making it impossible to type anywhere but the end. With a
  // mount-only effect the textarea manages its own caret/selection natively:
  // click to place, drag to select, arrow keys, mid-text insert/delete.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    const end = ta.value.length;
    ta.setSelectionRange(end, end);
  }, []);

  // Auto-grow the editing box to the rendered text height instead of the stored
  // frame `h`, so the frame hugs the text and tracks typing / deleting / line
  // re-wrapping live. Width stays the wrapping width (`element.w`) on purpose:
  // the textarea must wrap at the same width as the on-canvas text for its line
  // breaks — and therefore the caret — to line up with what's rendered.
  const autoGrow = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, []);

  // useLayoutEffect: resize before paint so the frame never flashes a stale
  // height as content changes.
  useLayoutEffect(() => {
    autoGrow();
  }, [autoGrow, content, font_id, font_size, line_height, align, direction, scale]);

  // Web fonts load asynchronously; once the real font applies, metrics (and so
  // the height) change — re-grow when font loading settles.
  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) autoGrow();
    });
    return () => {
      cancelled = true;
    };
  }, [autoGrow]);

  return (
    <textarea
      ref={textareaRef}
      value={content}
      rows={1}
      onChange={(e) => onContentChange(e.target.value)}
      onBlur={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
      dir={direction}
      style={{
        position: 'absolute',
        left: element.x * scale,
        top: element.y * scale,
        width: element.w * scale,
        // No `height` here — it's auto-grown imperatively (see autoGrow) so the
        // frame matches the rendered text, not the stored `element.h`.
        fontFamily: familyName,
        fontSize: font_size * scale,
        lineHeight: line_height,
        color,
        textAlign: align,
        background: 'hsla(0 0% 100% / 0.92)',
        // box-shadow (not border) draws the frame outside the box model, so it
        // can't shift the text off the rendered glyphs the way the old
        // border + padding did. padding:0 keeps the first glyph at the element
        // origin, exactly where the canvas renders it.
        boxShadow: `0 0 0 2px ${PRIMARY}`,
        borderRadius: 2,
        border: 'none',
        padding: 0,
        margin: 0,
        resize: 'none',
        outline: 'none',
        overflow: 'hidden',
        zIndex: 1000,
        boxSizing: 'border-box',
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
  // Rendered glyph bounds per text element id (see useTextMeasurements) — used
  // to size every selection affordance to the text instead of its frame.
  textMeasurements: Map<string, TextContentBox>;
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
  textMeasurements,
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
      ? ((elements.find((e) => e.id === textEditingId && e.type === 'text') as
          | (PageElement & { type: 'text' })
          | undefined) ?? null)
      : null;

  // Tight selection rect for the selected element (measured glyph box for text,
  // stored frame otherwise) — every selection affordance is positioned on it.
  const selectedRect = selectedElement ? getSelectionRect(selectedElement, textMeasurements) : null;

  // Action bubble sits 44px above the selection's top edge (in screen px),
  // clamped so it never goes above the overlay top.
  const bubbleY = selectedRect ? Math.max(0, toScreen(selectedRect.y) - 44) : 0;
  const bubbleX = selectedRect ? toScreen(selectedRect.x) : 0;

  return (
    <div
      onPointerDown={handleBackgroundPointerDown}
      style={{ position: 'absolute', inset: 0, isolation: 'isolate' }}
    >
      {/* Transparent hit-areas for each element (drag to move).
          Sized to the selection rect — for text that's the measured glyph box,
          so clicking the empty space around short/auto-height text no longer
          selects it. zIndex matches the element's visual z_index so the
          frontmost element's hit-area stays clickable regardless of overlap. */}
      {elements.map((element) => {
        const rect = getSelectionRect(element, textMeasurements);
        return (
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
              left: toScreen(rect.x),
              top: toScreen(rect.y),
              width: toScreen(rect.w),
              height: toScreen(rect.h),
              cursor: element.id === textEditingId ? 'default' : 'move',
              zIndex: element.z_index,
            }}
          />
        );
      })}

      {/* Selection border + subtle tint overlay. Hidden while inline-editing
          this element — the edit textarea draws its own frame, and the tight
          selection chrome would otherwise peek out past the editing box. */}
      {selectedElement && selectedRect && textEditingId !== selectedElement.id && (
        <div
          style={{
            position: 'absolute',
            left: toScreen(selectedRect.x),
            top: toScreen(selectedRect.y),
            width: toScreen(selectedRect.w),
            height: toScreen(selectedRect.h),
            border: `2px solid ${PRIMARY}`,
            background: PRIMARY_LIGHT,
            pointerEvents: 'none',
            boxSizing: 'border-box',
          }}
        />
      )}

      {/* Resize handles — placed on the selection rect (side handles for text,
          corners otherwise; see getHandles). The drag still seeds from the
          element's stored frame, so resizing adjusts the real geometry. */}
      {selectedElement &&
        selectedRect &&
        textEditingId !== selectedElement.id &&
        getHandles(selectedElement, selectedRect).map(({ mode, cx, cy, cursor }) => (
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
              left: toScreen(cx) - EDITOR_HANDLE_SIZE / 2,
              top: toScreen(cy) - EDITOR_HANDLE_SIZE / 2,
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
          <ActionBubbleButton label="Duplicate" onClick={() => onDuplicate(selectedElement.id)}>
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

          <ActionBubbleButton label="Delete" onClick={() => onDelete(selectedElement.id)} danger>
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
