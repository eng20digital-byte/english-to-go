import { useRef } from 'react';
import { PageCanvas } from '@/renderer/PageCanvas';
import { usePageElementsQuery } from '@/hooks/usePageElementsQuery';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/canvas';
import type { PageRow } from '@/types/database';

// Thumbnail width in screen pixels — scale = THUMBNAIL_WIDTH / CANVAS_WIDTH.
const THUMBNAIL_WIDTH = 100;
const THUMBNAIL_HEIGHT = Math.round((THUMBNAIL_WIDTH / CANVAS_WIDTH) * CANVAS_HEIGHT);
const THUMBNAIL_SCALE = THUMBNAIL_WIDTH / CANVAS_WIDTH;

interface PageThumbnailProps {
  page: PageRow;
  pageIndex: number;
  bookletId: string;
  isSelected: boolean;
  onClick: () => void;
}

export function PageThumbnail({
  page,
  pageIndex,
  isSelected,
  onClick,
}: PageThumbnailProps) {
  const { data: elements = [], isLoading } = usePageElementsQuery(page.id);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Page ${pageIndex + 1}${page.is_quiz_page ? ' (quiz)' : ''}`}
      className="group w-full text-left"
    >
      <div
        className={`relative overflow-hidden rounded-lg transition-all duration-150 ${
          isSelected
            ? 'ring-2 ring-primary shadow-[var(--shadow-raised)]'
            : 'ring-1 ring-border hover:ring-primary/50 hover:shadow-[var(--shadow-card)]'
        }`}
        style={{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }}
        ref={containerRef}
      >
        {isLoading ? (
          <div className="h-full w-full animate-pulse bg-muted" />
        ) : (
          // PageCanvas renders inline — no Tailwind inside the renderer per CLAUDE.md.
          <PageCanvas
            page={{ id: page.id, elements }}
            scale={THUMBNAIL_SCALE}
            renderMode="editor"
          />
        )}

        {/* Page number badge */}
        <div
          className={`absolute bottom-1 right-1 rounded px-1 py-0.5 text-[9px] font-semibold leading-none ${
            isSelected
              ? 'bg-primary text-primary-foreground'
              : 'bg-black/40 text-white'
          }`}
        >
          {pageIndex + 1}
          {page.is_quiz_page && ' Q'}
        </div>
      </div>
    </button>
  );
}
