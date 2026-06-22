import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useBookletByToken } from '@/hooks/useBookletQuery';
import { useCanvasScale } from '@/renderer/useCanvasScale';
import { PageCanvas } from '@/renderer/PageCanvas';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/canvas';
import { PageNav } from './PageNav';

// Caps how wide the canvas grows on large desktop viewports; mobile/tablet
// just fill available width (container is `width: 100%` below).
const READER_MAX_WIDTH = 640;

function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 24,
      }}
    >
      <p>{children}</p>
    </div>
  );
}

// Public reader: no auth, no admin chrome, no Tailwind — outside the
// `#admin-root` scope boundary in CLAUDE.md "UI component library". Renders
// the same `PageCanvas` the editor uses (renderMode="reader"), so visual
// output is guaranteed to match what was built in the admin app.
//
// RLS already restricts anonymous reads to published booklets, so an unknown
// token and a draft/disabled one both resolve to `booklet === null` here —
// rendered as one generic not-found message, never distinguishing the two
// (see useBookletQuery's comment and M5 manual verification steps 3-4).
export function ReaderBookletPage() {
  const { token } = useParams<{ token: string }>();
  const { data: booklet, isLoading, isError } = useBookletByToken(token);
  const [pageIndex, setPageIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scale = useCanvasScale(containerRef);

  useEffect(() => {
    if (booklet) document.title = booklet.title;
  }, [booklet]);

  if (isLoading) return <CenteredMessage>Loading…</CenteredMessage>;
  if (isError) return <CenteredMessage>Something went wrong loading this booklet.</CenteredMessage>;
  if (!booklet) return <CenteredMessage>This booklet could not be found.</CenteredMessage>;
  if (booklet.pages.length === 0)
    return <CenteredMessage>This booklet has no pages yet.</CenteredMessage>;

  const clampedIndex = Math.min(pageIndex, booklet.pages.length - 1);
  const currentPage = booklet.pages[clampedIndex];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 16,
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          maxWidth: READER_MAX_WIDTH,
          aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
          overflow: 'hidden',
        }}
      >
        <PageCanvas page={currentPage} scale={scale} renderMode="reader" />
      </div>
      <PageNav
        currentIndex={clampedIndex}
        pageCount={booklet.pages.length}
        onChange={setPageIndex}
      />
    </div>
  );
}
