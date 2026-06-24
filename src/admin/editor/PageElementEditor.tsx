import { useEffect, useRef, useState } from 'react';
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
import { useEditorReducer } from './useEditorReducer';
import { useAutosave } from './useAutosave';
import { EditorCanvas } from './EditorCanvas';
import { EditorToolbar } from './EditorToolbar';
import { ElementInspector } from './ElementInspector';
import { MediaLibraryPicker } from './MediaLibraryPicker';
import { Spinner } from '@/components/Spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PageElement, TextProps, BackgroundImageProps } from '@/types/elements';
import type { MediaAssetRow } from '@/types/database';

interface PageElementEditorProps {
  pageId: string;
  // Exposed so BookletEditorPage can access save status for the header bar.
  onSaveStatusChange?: (status: import('./useAutosave').SaveStatus) => void;
}

function nextZIndex(elements: PageElement[]): number {
  return elements.reduce((max, element) => Math.max(max, element.z_index), -1) + 1;
}

function lowestZIndex(elements: PageElement[]): number {
  return elements.reduce((min, element) => Math.min(min, element.z_index), 0) - 1;
}

// Top-level page editor: loads a page's elements once, owns the undo/redo
// reducer and (separately) selection + textEditingId UI state, and hosts the
// toolbar, shared canvas, style inspector, and autosave.
export function PageElementEditor({ pageId, onSaveStatusChange }: PageElementEditorProps) {
  const { data: loadedElements, isLoading, isError } = usePageElementsQuery(pageId);
  const { data: fonts } = useFontsQuery();
  const [state, dispatch] = useEditorReducer();
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [textEditingId, setTextEditingId] = useState<string | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const hasDispatchedLoadRef = useRef(false);

  // Seed the reducer exactly once per mounted page — a later background
  // refetch (e.g. window refocus) must not silently wipe in-memory edits.
  useEffect(() => {
    if (loadedElements && !hasDispatchedLoadRef.current) {
      hasDispatchedLoadRef.current = true;
      dispatch({ type: 'SET_ELEMENTS', elements: loadedElements });
    }
  }, [loadedElements, dispatch]);

  const { status: saveStatus, saveNow } = useAutosave(pageId, state.elements, state.loaded);

  useEffect(() => {
    onSaveStatusChange?.(saveStatus);
  }, [saveStatus, onSaveStatusChange]);

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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          <span>Loading page…</span>
        </div>
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-destructive">Could not load this page's elements.</p>
      </div>
    );
  }

  const selectedElement =
    state.elements.find((element) => element.id === effectiveSelectedId) ?? null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Floating pill toolbar */}
      <EditorToolbar
        onAddText={handleAddText}
        onAddBackgroundImage={() => setShowMediaPicker(true)}
        onUndo={() => dispatch({ type: 'UNDO' })}
        canUndo={state.past.length > 0}
        onRedo={() => dispatch({ type: 'REDO' })}
        canRedo={state.future.length > 0}
        saveStatus={saveStatus}
        onSaveNow={() => void saveNow()}
      />

      {/* Canvas + inspector */}
      <div className="flex min-h-0 flex-1">
        {/* Canvas area — flex-1, scrollable */}
        <div className="flex flex-1 items-start justify-center overflow-y-auto bg-background p-6 pt-4">
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

        {/* Right inspector panel */}
        <aside className="w-[280px] shrink-0 overflow-hidden border-l border-border bg-card">
          <ElementInspector
            element={selectedElement}
            onUpdateTextProps={handleUpdateTextProps}
            onUpdateBackgroundImageProps={handleUpdateBackgroundImageProps}
          />
        </aside>
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
