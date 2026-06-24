import { useRef, useState } from 'react';
import { PageCanvas } from '@/renderer/PageCanvas';
import { usePageElementsQuery } from '@/hooks/usePageElementsQuery';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/canvas';
import type { PageRow } from '@/types/database';
import { BRAND } from '@/config/theme';

// Thumbnail width in screen pixels — scale = THUMBNAIL_WIDTH / CANVAS_WIDTH.
// 162×91 gives a crisp 16:9 landscape thumbnail that fits inside the sidebar.
const THUMBNAIL_WIDTH = 162;
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
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Page ${pageIndex + 1}${page.is_quiz_page ? ' (quiz)' : ''}`}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
      }}
    >
      <div
        ref={containerRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 10,
          width: THUMBNAIL_WIDTH,
          height: THUMBNAIL_HEIGHT,
          // Selected: green glow ring + elevation.
          // Hovered: lifted shadow.
          boxShadow: isSelected
            ? `0 0 0 2.5px ${BRAND.green}, 0 8px 20px rgba(0,0,0,0.22)`
            : hovered
              ? '0 6px 18px rgba(0,0,0,0.2)'
              : '0 2px 8px rgba(0,0,0,0.14)',
          transform: isSelected || hovered ? 'translateY(-2px)' : 'translateY(0)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {isLoading ? (
          <div style={{
            height: '100%', width: '100%',
            backgroundColor: 'rgba(89,178,146,0.12)',
            animation: 'sk-pulse 1.5s ease-in-out infinite',
          }} />
        ) : (
          // PageCanvas renders inline — no Tailwind inside the renderer per CLAUDE.md.
          <PageCanvas
            page={{ id: page.id, elements }}
            scale={THUMBNAIL_SCALE}
            renderMode="editor"
          />
        )}

        {/* Page number badge */}
        <div style={{
          position: 'absolute',
          bottom: 4, right: 4,
          padding: '2px 6px',
          borderRadius: 5,
          fontSize: 9,
          fontWeight: 700,
          lineHeight: 1,
          backgroundColor: isSelected ? BRAND.green : 'rgba(0,0,0,0.45)',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
        }}>
          {pageIndex + 1}{page.is_quiz_page && ' Q'}
        </div>
      </div>
    </button>
  );
}
