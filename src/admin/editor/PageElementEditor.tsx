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
import type { PageElement, TextProps, BackgroundImageProps } from '@/types/elements';
import type { MediaAssetRow } from '@/types/database';

interface PageElementEditorProps {
  pageId: string;
}

function nextZIndex(elements: PageElement[]): number {
  return elements.reduce((max, element) => Math.max(max, element.z_index), -1) + 1;
}

function lowestZIndex(elements: PageElement[]): number {
  return elements.reduce((min, element) => Math.min(min, element.z_index), 0) - 1;
}

// Top-level page editor: loads a page's elements once, owns the undo/redo
// reducer and (separately) selection state, and hosts the add/delete
// toolbar, the shared canvas, the style inspector, and autosave.
export function PageElementEditor({ pageId }: PageElementEditorProps) {
  const { data: loadedElements, isLoading, isError } = usePageElementsQuery(pageId);
  const { data: fonts } = useFontsQuery();
  const [state, dispatch] = useEditorReducer();
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const hasDispatchedLoadRef = useRef(false);

  // Seed the reducer exactly once per mounted page — a later background
  // refetch (e.g. window refocus) must not silently wipe in-memory edits.
  // `state.loaded` (set by the SET_ELEMENTS reducer case, not a separate
  // setState here) is what downstream code reads, so this effect only ever
  // dispatches — it never calls setState directly.
  useEffect(() => {
    if (loadedElements && !hasDispatchedLoadRef.current) {
      hasDispatchedLoadRef.current = true;
      dispatch({ type: 'SET_ELEMENTS', elements: loadedElements });
    }
  }, [loadedElements, dispatch]);

  // Persistence (M9): debounced save of the element array, only once the
  // reducer has been seeded — see useAutosave's `enabled` doc comment.
  const { status: saveStatus, saveNow } = useAutosave(pageId, state.elements, state.loaded);

  // If undo/redo (or delete) removes the selected element, derive selection
  // from the current element array each render rather than syncing
  // `selectedElementId` back to null via an effect — `effectiveSelectedId`
  // is what's actually passed down, so a stale id never reaches the canvas.
  const effectiveSelectedId =
    selectedElementId && state.elements.some((element) => element.id === selectedElementId)
      ? selectedElementId
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

  function handleDeleteSelected() {
    if (!effectiveSelectedId) return;
    dispatch({ type: 'DELETE_ELEMENT', id: effectiveSelectedId });
    setSelectedElementId(null);
  }

  function handleUpdateTextProps(id: string, changes: Partial<TextProps>) {
    dispatch({ type: 'UPDATE_TEXT_PROPS', id, changes });
  }

  function handleUpdateBackgroundImageProps(id: string, changes: Partial<BackgroundImageProps>) {
    dispatch({ type: 'UPDATE_BACKGROUND_IMAGE_PROPS', id, changes });
  }

  if (isLoading) {
    return <p className="text-muted-foreground">Loading page…</p>;
  }
  if (isError) {
    return <p className="text-destructive">Could not load this page's elements.</p>;
  }

  return (
    <div className="mt-8">
      <EditorToolbar
        onAddText={handleAddText}
        onAddBackgroundImage={() => setShowMediaPicker(true)}
        onDeleteSelected={handleDeleteSelected}
        hasSelection={!!effectiveSelectedId}
        onUndo={() => dispatch({ type: 'UNDO' })}
        canUndo={state.past.length > 0}
        onRedo={() => dispatch({ type: 'REDO' })}
        canRedo={state.future.length > 0}
        saveStatus={saveStatus}
        onSaveNow={() => void saveNow()}
      />

      <div className="flex flex-wrap items-start gap-4">
        <EditorCanvas
          pageId={pageId}
          elements={state.elements}
          selectedElementId={effectiveSelectedId}
          onSelectElement={setSelectedElementId}
          onCommitGeometry={(id, changes) => dispatch({ type: 'UPDATE_ELEMENT', id, changes })}
        />

        <ElementInspector
          element={state.elements.find((element) => element.id === effectiveSelectedId) ?? null}
          onUpdateTextProps={handleUpdateTextProps}
          onUpdateBackgroundImageProps={handleUpdateBackgroundImageProps}
        />
      </div>

      {showMediaPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowMediaPicker(false);
          }}
        >
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-md bg-background p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Choose a background image</h2>
              <button
                type="button"
                onClick={() => setShowMediaPicker(false)}
                className="text-sm text-muted-foreground hover:underline"
              >
                Close
              </button>
            </div>
            <MediaLibraryPicker onSelect={handleSelectBackgroundImage} />
          </div>
        </div>
      )}
    </div>
  );
}
