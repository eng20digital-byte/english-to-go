import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { EDITOR_PRIMARY } from '@/config/editor';
import type { PageElement } from '@/types/elements';

interface TextEditOverlayProps {
  element: PageElement & { type: 'text' };
  scale: number;
  onContentChange: (content: string) => void;
  onClose: () => void;
}

// The in-place text-editing textarea: overlays the rendered text faithfully
// (real @font-face family, font_size × scale, matching line-height/align/
// direction, zero padding, box-shadow frame) and auto-grows to the content —
// see CLAUDE.md "Shared renderer / Text selection geometry".
export function TextEditOverlay({ element, scale, onContentChange, onClose }: TextEditOverlayProps) {
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
        boxShadow: `0 0 0 2px ${EDITOR_PRIMARY}`,
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
