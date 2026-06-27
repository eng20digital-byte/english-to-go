import { useEffect, useRef, useState } from 'react';
import { ImageIcon, Languages, Redo2, RotateCcw, Save, Type } from 'lucide-react';
import { usePageElementsQuery } from '@/hooks/usePageElementsQuery';
import { useFontsQuery } from '@/hooks/useFontsQuery';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DEFAULT_FONT_SIZE,
  DEFAULT_TEXT_COLOR,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_TEXT_ALIGN,
  DEFAULT_TEXT_DIRECTION,
} from '@/config/canvas';
import {
  DEFAULT_FONT,
  NEW_TEXT_ELEMENT_WIDTH,
  NEW_TEXT_ELEMENT_HEIGHT,
  NEW_TEXT_ELEMENT_CONTENT,
} from '@/config/editor';
import {
  NEW_VOCABULARY_ELEMENT_WIDTH,
  NEW_VOCABULARY_ELEMENT_HEIGHT,
  NEW_VOCABULARY_WORDS,
  DEFAULT_VOCABULARY_SHOW_ON_PAGE,
  DEFAULT_VOCABULARY_FONT_SIZE,
  DEFAULT_VOCABULARY_TEXT_COLOR,
  DEFAULT_VOCABULARY_BUBBLE_BACKGROUND,
  DEFAULT_VOCABULARY_BUBBLE_BORDER_COLOR,
  DEFAULT_VOCABULARY_BUBBLE_BORDER_WIDTH,
  DEFAULT_VOCABULARY_BUBBLE_BORDER_RADIUS,
  DEFAULT_VOCABULARY_BUBBLE_PADDING_X,
  DEFAULT_VOCABULARY_BUBBLE_PADDING_Y,
  DEFAULT_VOCABULARY_BUBBLE_SPACING,
} from '@/config/vocabulary';
import { useEditorReducer } from './useEditorReducer';
import { useAutosave } from './useAutosave';
import type { ElementClipboard } from './clipboard/useElementClipboard';
import { EditorCanvas } from './EditorCanvas';
import { ElementInspector } from './ElementInspector';
import { MediaLibraryPicker } from './MediaLibraryPicker';
import { Spinner } from '@/components/Spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BRAND } from '@/config/theme';
import type {
  PageElement,
  TextProps,
  BackgroundImageProps,
  VocabularyProps,
} from '@/types/elements';
import type { MediaAssetRow } from '@/types/database';

interface PageElementEditorProps {
  pageId: string;
  // Editor-wide element clipboard (owned by BookletEditorPage so it survives the
  // per-page remount of this component) — drives Ctrl+C / Ctrl+X / Ctrl+V.
  elementClipboard: ElementClipboard;
  // BookletEditorPage parks this page's "flush pending autosave" callback here so
  // page-level copy/cut/duplicate of the open page persist edits before reading
  // them back from the DB. Cleared on unmount.
  flushRef: React.MutableRefObject<(() => Promise<void>) | null>;
  // Exposed so BookletEditorPage can access save status for the header bar.
  onSaveStatusChange?: (status: import('./useAutosave').SaveStatus) => void;
}

function nextZIndex(elements: PageElement[]): number {
  return elements.reduce((max, element) => Math.max(max, element.z_index), -1) + 1;
}

function lowestZIndex(elements: PageElement[]): number {
  return elements.reduce((min, element) => Math.min(min, element.z_index), 0) - 1;
}

// Large icon+label action button used in the Quick Actions panel.
function QuickActionBtn({
  icon, label, bgColor, textColor = BRAND.text, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  bgColor: string;
  textColor?: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 7, padding: '12px 6px', borderRadius: 14, border: 'none',
        backgroundColor: bgColor, color: textColor,
        cursor: 'pointer', fontFamily: 'inherit',
        transition: 'transform 0.16s ease, box-shadow 0.16s ease',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 8px 20px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.1)'
          : '0 3px 8px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.28)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>{label}</span>
    </button>
  );
}

// Small circular icon button for undo/redo/save.
function MiniIconBtn({
  label, disabled, onClick, children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            width: 30, height: 30, borderRadius: '50%', border: 'none', padding: 0,
            backgroundColor: hovered && !disabled ? 'rgba(89,178,146,0.14)' : 'transparent',
            color: disabled ? 'rgba(26,26,26,0.28)' : BRAND.text,
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background-color 0.15s',
            fontFamily: 'inherit', flexShrink: 0,
          }}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

const PANEL_SHADOW = '0 8px 28px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)';

// Top-level page editor: loads a page's elements once, owns the undo/redo
// reducer and (separately) selection + textEditingId UI state, and hosts the
// shared canvas, style inspector, and autosave.
export function PageElementEditor({
  pageId,
  elementClipboard,
  flushRef,
  onSaveStatusChange,
}: PageElementEditorProps) {
  const { data: loadedElements, isLoading, isError } = usePageElementsQuery(pageId);
  const { data: fonts } = useFontsQuery();
  const [state, dispatch] = useEditorReducer();
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [textEditingId, setTextEditingId] = useState<string | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const hasDispatchedLoadRef = useRef(false);
  // Refs so the single keydown handler always sees latest values without
  // re-registering on every render (it's registered once, keyed to [dispatch]).
  const selectedIdRef = useRef<string | null>(null);
  const textEditingIdRef = useRef<string | null>(null);
  const elementsRef = useRef<PageElement[]>(state.elements);
  const clipboardRef = useRef<ElementClipboard>(elementClipboard);

  // Seed the reducer exactly once per mounted page — a later background
  // refetch (e.g. window refocus) must not silently wipe in-memory edits.
  useEffect(() => {
    if (loadedElements && !hasDispatchedLoadRef.current) {
      hasDispatchedLoadRef.current = true;
      dispatch({ type: 'SET_ELEMENTS', elements: loadedElements });
    }
  }, [loadedElements, dispatch]);

  const { status: saveStatus, saveNow, flushIfDirty } = useAutosave(
    pageId,
    state.elements,
    state.loaded,
  );

  useEffect(() => {
    onSaveStatusChange?.(saveStatus);
  }, [saveStatus, onSaveStatusChange]);

  // Expose this page's flush to BookletEditorPage so page-level ops on the
  // currently-open page persist edits before reading them back from the DB.
  useEffect(() => {
    flushRef.current = flushIfDirty;
    return () => {
      if (flushRef.current === flushIfDirty) flushRef.current = null;
    };
  }, [flushRef, flushIfDirty]);

  // If undo/redo (or delete) removes the selected element, derive selection
  // from the current element array each render rather than syncing back via effect.
  const effectiveSelectedId =
    selectedElementId && state.elements.some((element) => element.id === selectedElementId)
      ? selectedElementId
      : null;

  // Same pattern for textEditingId — clear if element no longer exists.
  const effectiveTextEditingId =
    textEditingId && state.elements.some((e) => e.id === textEditingId)
      ? textEditingId
      : null;

  // Keep the refs the (once-registered) keydown handler reads in sync after each
  // render. Done in an effect rather than during render (react-hooks/refs
  // forbids the latter); key events fire after commit, so the refs are always
  // current by the time the handler runs. The clipboard ref matters because
  // `takePaste`'s identity changes whenever clipboard content changes.
  useEffect(() => {
    clipboardRef.current = elementClipboard;
    elementsRef.current = state.elements;
    selectedIdRef.current = effectiveSelectedId;
    textEditingIdRef.current = effectiveTextEditingId;
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip when focus is inside any text input (including the text-edit textarea).
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (textEditingIdRef.current !== null) return;

      const ctrl = e.ctrlKey || e.metaKey;
      // Page-level shortcuts (Ctrl+Shift+…) are owned by BookletEditorPage; the
      // only Shift combo we handle here is redo (Ctrl+Shift+Z), special-cased
      // below. Everything else element-level is plain Ctrl, so bail on Shift to
      // avoid stealing the page combos that also share the same window listener.
      const isRedo = ctrl && e.code === 'KeyZ' && e.shiftKey;
      if (e.shiftKey && !isRedo) return;

      const selectedId = selectedIdRef.current;
      const elements = elementsRef.current;
      const clipboard = clipboardRef.current;

      // Undo / Redo — must come before Delete check to avoid conflict.
      if (ctrl && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
        return;
      }
      if (ctrl && (e.code === 'KeyY' || isRedo)) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
        return;
      }

      // Delete — bare Delete/Backspace only (Ctrl+Shift+Delete is "delete page").
      if ((e.key === 'Delete' || e.key === 'Backspace') && !ctrl && selectedId) {
        e.preventDefault();
        dispatch({ type: 'DELETE_ELEMENT', id: selectedId });
        setSelectedElementId(null);
        setTextEditingId(null);
        return;
      }

      // Copy — capture the selected element into the editor-wide clipboard.
      // Use e.code for letter shortcuts so Caps Lock / locale don't break them.
      if (ctrl && e.code === 'KeyC' && selectedId) {
        const el = elements.find((element) => element.id === selectedId);
        if (el) clipboard.copy([el]);
        return;
      }

      // Cut — copy then remove (one delete = one undo step; the copy lives in
      // the clipboard so it can be pasted back, here or on another page).
      if (ctrl && e.code === 'KeyX' && selectedId) {
        e.preventDefault();
        const el = elements.find((element) => element.id === selectedId);
        if (el) clipboard.copy([el]);
        dispatch({ type: 'DELETE_ELEMENT', id: selectedId });
        setSelectedElementId(null);
        setTextEditingId(null);
        return;
      }

      // Paste — onto THIS page (cross-page works because the clipboard is owned
      // above the per-page remount). New ids/z-index are produced by takePaste.
      if (ctrl && e.code === 'KeyV' && clipboard.hasElements) {
        e.preventDefault();
        const baseZ = nextZIndex(elements);
        const pasted = clipboard.takePaste(pageId, baseZ);
        if (pasted.length > 0) {
          dispatch({ type: 'ADD_ELEMENTS', elements: pasted });
          setSelectedElementId(pasted[0].id);
        }
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // pageId is stable for a given mount (this component is keyed by it), so the
    // handler is safely registered once; everything mutable is read via refs.
  }, [dispatch, pageId]);

  function resolveDefaultFontId(): string {
    if (!fonts || fonts.length === 0) return '';
    const match = fonts.find(
      (font) => font.name === DEFAULT_FONT.name && font.weight === DEFAULT_FONT.weight,
    );
    return (match ?? fonts[0]).id;
  }

  function handleAddText() {
    const id = crypto.randomUUID();
    const newElement: PageElement = {
      id,
      page_id: pageId,
      type: 'text',
      z_index: nextZIndex(state.elements),
      x: (CANVAS_WIDTH - NEW_TEXT_ELEMENT_WIDTH) / 2,
      y: (CANVAS_HEIGHT - NEW_TEXT_ELEMENT_HEIGHT) / 2,
      w: NEW_TEXT_ELEMENT_WIDTH,
      h: NEW_TEXT_ELEMENT_HEIGHT,
      rotation: 0,
      props: {
        content: NEW_TEXT_ELEMENT_CONTENT,
        font_id: resolveDefaultFontId(),
        font_size: DEFAULT_FONT_SIZE,
        color: DEFAULT_TEXT_COLOR,
        align: DEFAULT_TEXT_ALIGN,
        line_height: DEFAULT_LINE_HEIGHT,
        direction: DEFAULT_TEXT_DIRECTION,
      },
    };
    dispatch({ type: 'ADD_ELEMENT', element: newElement });
    setSelectedElementId(id);
  }

  function handleAddVocabulary() {
    const id = crypto.randomUUID();
    const defaultFontId = resolveDefaultFontId();
    const newElement: PageElement = {
      id,
      page_id: pageId,
      type: 'vocabulary',
      z_index: nextZIndex(state.elements),
      x: (CANVAS_WIDTH - NEW_VOCABULARY_ELEMENT_WIDTH) / 2,
      y: (CANVAS_HEIGHT - NEW_VOCABULARY_ELEMENT_HEIGHT) / 2,
      w: NEW_VOCABULARY_ELEMENT_WIDTH,
      h: NEW_VOCABULARY_ELEMENT_HEIGHT,
      rotation: 0,
      props: {
        // Fresh copy of the seed array so later edits never mutate the shared const.
        words: NEW_VOCABULARY_WORDS.map((word) => ({ ...word })),
        show_on_page: DEFAULT_VOCABULARY_SHOW_ON_PAGE,
        english_font_id: defaultFontId,
        hebrew_font_id: defaultFontId,
        font_size: DEFAULT_VOCABULARY_FONT_SIZE,
        text_color: DEFAULT_VOCABULARY_TEXT_COLOR,
        bubble_background_color: DEFAULT_VOCABULARY_BUBBLE_BACKGROUND,
        bubble_border_color: DEFAULT_VOCABULARY_BUBBLE_BORDER_COLOR,
        bubble_border_width: DEFAULT_VOCABULARY_BUBBLE_BORDER_WIDTH,
        bubble_border_radius: DEFAULT_VOCABULARY_BUBBLE_BORDER_RADIUS,
        bubble_padding_x: DEFAULT_VOCABULARY_BUBBLE_PADDING_X,
        bubble_padding_y: DEFAULT_VOCABULARY_BUBBLE_PADDING_Y,
        bubble_spacing: DEFAULT_VOCABULARY_BUBBLE_SPACING,
      },
    };
    dispatch({ type: 'ADD_ELEMENT', element: newElement });
    setSelectedElementId(id);
  }

  function handleSelectBackgroundImage(asset: MediaAssetRow) {
    const id = crypto.randomUUID();
    const newElement: PageElement = {
      id,
      page_id: pageId,
      type: 'background_image',
      z_index: lowestZIndex(state.elements),
      x: 0,
      y: 0,
      w: CANVAS_WIDTH,
      h: CANVAS_HEIGHT,
      rotation: 0,
      props: { media_asset_id: asset.id, fit: 'cover' },
    };
    dispatch({ type: 'ADD_ELEMENT', element: newElement });
    setSelectedElementId(id);
    setShowMediaPicker(false);
  }

  function handleUpdateTextProps(id: string, changes: Partial<TextProps>) {
    dispatch({ type: 'UPDATE_TEXT_PROPS', id, changes });
  }

  function handleUpdateBackgroundImageProps(id: string, changes: Partial<BackgroundImageProps>) {
    dispatch({ type: 'UPDATE_BACKGROUND_IMAGE_PROPS', id, changes });
  }

  function handleUpdateVocabularyProps(id: string, changes: Partial<VocabularyProps>) {
    dispatch({ type: 'UPDATE_VOCABULARY_PROPS', id, changes });
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Spinner />
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.78)' }}>Loading page…</span>
      </div>
    );
  }
  if (isError) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 14, color: BRAND.pink, margin: 0 }}>Could not load this page's elements.</p>
      </div>
    );
  }

  const selectedElement =
    state.elements.find((element) => element.id === effectiveSelectedId) ?? null;

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  return (
    <div style={{
      display: 'flex', height: '100%', overflow: 'hidden',
      gap: 12,
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
    }}>
      {/* ── Center: canvas workspace ────────────────────────────────────── */}
      {/* Transparent — green parent background shows through as the workspace.
          The canvas is aspect-ratio constrained so it always fits without scroll. */}
      <div style={{
        flex: 1, minWidth: 0, minHeight: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '12px 4px 16px',
        overflow: 'hidden',
      }}>
        {/* Aspect-ratio constraint wrapper: limits canvas to available height,
            so the page always fits in view — never requires scrolling.
            maxHeight: 100% + aspect-ratio together produce "contain" semantics. */}
        <div style={{
          width: '100%',
          maxHeight: '100%',
          aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
          overflow: 'hidden',
        }}>
          <EditorCanvas
            pageId={pageId}
            elements={state.elements}
            selectedElementId={effectiveSelectedId}
            textEditingId={effectiveTextEditingId}
            onSelectElement={setSelectedElementId}
            onSetTextEditing={(id) => {
              setSelectedElementId(id);
              setTextEditingId(id);
            }}
            onClearTextEditing={() => setTextEditingId(null)}
            onTextChange={(id, content) =>
              dispatch({ type: 'UPDATE_TEXT_PROPS', id, changes: { content } })
            }
            onCommitGeometry={(id, changes) =>
              dispatch({ type: 'UPDATE_ELEMENT', id, changes })
            }
            onDuplicate={(id) =>
              dispatch({ type: 'DUPLICATE_ELEMENT', id, newId: crypto.randomUUID() })
            }
            onDelete={(id) => {
              dispatch({ type: 'DELETE_ELEMENT', id });
              setSelectedElementId(null);
              setTextEditingId(null);
            }}
            onBringForward={(id) => dispatch({ type: 'BRING_FORWARD', id })}
            onSendBackward={(id) => dispatch({ type: 'SEND_BACKWARD', id })}
          />
        </div>
      </div>

      {/* ── Right: tools column (Quick Actions + Properties) ──────────── */}
      <div style={{
        width: 252, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        gap: 10, paddingBottom: 16, paddingTop: 6,
      }}>

        {/* Quick Actions card — add elements, undo/redo, save */}
        <div style={{
          backgroundColor: BRAND.cream,
          borderRadius: 20,
          padding: '14px 14px 12px',
          boxShadow: PANEL_SHADOW,
          flexShrink: 0,
        }}>
          <p style={{
            margin: '0 0 12px', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: BRAND.textMuted,
          }}>
            Add to Page
          </p>

          {/* Primary action buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            <QuickActionBtn
              icon={<Type size={18} />}
              label="Text"
              bgColor={BRAND.yellow}
              textColor={BRAND.text}
              onClick={handleAddText}
            />
            <QuickActionBtn
              icon={<ImageIcon size={18} />}
              label="Image"
              bgColor={BRAND.green}
              textColor="#fff"
              onClick={() => setShowMediaPicker(true)}
            />
            <QuickActionBtn
              icon={<Languages size={18} />}
              label="Vocab"
              bgColor={BRAND.pink}
              textColor="#fff"
              onClick={handleAddVocabulary}
            />
          </div>

          {/* Undo / Redo / Save row */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 10,
            borderTop: '1px solid rgba(0,0,0,0.07)',
          }}>
            <div style={{ display: 'flex', gap: 2 }}>
              <MiniIconBtn label="Undo" disabled={!canUndo} onClick={() => dispatch({ type: 'UNDO' })}>
                <RotateCcw size={14} />
              </MiniIconBtn>
              <MiniIconBtn label="Redo" disabled={!canRedo} onClick={() => dispatch({ type: 'REDO' })}>
                <Redo2 size={14} />
              </MiniIconBtn>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {saveStatus === 'saving' && (
                <span style={{ fontSize: 11, color: BRAND.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Spinner size="sm" /> Saving…
                </span>
              )}
              {saveStatus === 'saved' && (
                <span style={{ fontSize: 11, fontWeight: 600, color: BRAND.green }}>✓ Saved</span>
              )}
              {saveStatus === 'error' && (
                <span style={{ fontSize: 11, fontWeight: 600, color: BRAND.pink }}>Failed</span>
              )}
              {saveStatus !== 'saving' && (
                <MiniIconBtn label="Save now" onClick={() => void saveNow()}>
                  <Save size={14} />
                </MiniIconBtn>
              )}
            </div>
          </div>
        </div>

        {/* Properties panel — scrolls internally, never causes outer layout shift */}
        <div style={{
          flex: 1, minHeight: 0,
          backgroundColor: BRAND.cream,
          borderRadius: 20,
          boxShadow: PANEL_SHADOW,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <ElementInspector
            element={selectedElement}
            onUpdateTextProps={handleUpdateTextProps}
            onUpdateBackgroundImageProps={handleUpdateBackgroundImageProps}
            onUpdateVocabularyProps={handleUpdateVocabularyProps}
          />
        </div>
      </div>

      {/* Media picker dialog */}
      <Dialog open={showMediaPicker} onOpenChange={setShowMediaPicker}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose a background image</DialogTitle>
          </DialogHeader>
          <MediaLibraryPicker onSelect={handleSelectBackgroundImage} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
