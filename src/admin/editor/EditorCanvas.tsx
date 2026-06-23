import { useRef, useState } from 'react';
import { PageCanvas, type PageCanvasPage } from '@/renderer/PageCanvas';
import { useCanvasScale } from '@/renderer/useCanvasScale';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/canvas';
import { EDITOR_CANVAS_MAX_WIDTH } from '@/config/editor';
import { EditorOverlay, type GeometryOverride } from './EditorOverlay';
import type { GeometryChanges } from './useEditorReducer';
import type { PageElement } from '@/types/elements';

interface EditorCanvasProps {
  pageId: string;
  elements: PageElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onCommitGeometry: (id: string, changes: GeometryChanges) => void;
}

// Renders the same shared `PageCanvas` the reader uses (renderMode="editor")
// plus a sibling `EditorOverlay`, both driven by one `useCanvasScale`
// instance — per CLAUDE.md rule #1, this is the only place that pairs them,
// and it never forks PageCanvas itself.
export function EditorCanvas({
  pageId,
  elements,
  selectedElementId,
  onSelectElement,
  onCommitGeometry,
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scale = useCanvasScale(containerRef);
  const [liveOverride, setLiveOverride] = useState<GeometryOverride | null>(null);

  // Drag/resize is previewed locally here (not dispatched to the reducer on
  // every pointermove) so a single gesture produces exactly one undo step,
  // committed on pointer-up. Both PageCanvas and EditorOverlay render this
  // same merged array, so the moving element and its selection handles can
  // never visually diverge.
  const displayElements =
    liveOverride !== null
      ? elements.map((element) =>
          element.id === liveOverride.id ? { ...element, ...liveOverride.changes } : element,
        )
      : elements;

  const page: PageCanvasPage = { id: pageId, elements: displayElements };

  function handleCommit(id: string, changes: GeometryChanges) {
    setLiveOverride(null);
    onCommitGeometry(id, changes);
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: EDITOR_CANVAS_MAX_WIDTH,
        aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
        overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      <PageCanvas page={page} scale={scale} renderMode="editor" />
      <EditorOverlay
        elements={displayElements}
        scale={scale}
        selectedElementId={selectedElementId}
        onSelectElement={onSelectElement}
        onLiveChange={setLiveOverride}
        onCommit={handleCommit}
      />
    </div>
  );
}
