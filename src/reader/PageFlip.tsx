import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { useCanvasScale } from '@/renderer/useCanvasScale';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/canvas';
import {
  READER_MAX_WIDTH,
  PAGE_FLIP_DURATION_MS,
  PAGE_FLIP_EASING,
  PAGE_FLIP_PERSPECTIVE_PX,
  PAGE_FLIP_SHADOW_MAX_OPACITY,
  SWIPE_THRESHOLD_PX,
  SWIPE_THRESHOLD_RATIO,
  DRAG_CAPTURE_THRESHOLD_PX,
} from '@/config/reader';

type FlipDirection = 'next' | 'prev';

interface FlipState {
  direction: FlipDirection;
  fromIndex: number;
  toIndex: number;
}

interface PageFlipRenderArgs {
  next: () => void;
  prev: () => void;
  isFlipping: boolean;
}

interface PageFlipProps {
  pageCount: number;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  renderPage: (index: number, scale: number) => ReactNode;
  children?: (args: PageFlipRenderArgs) => ReactNode;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// Booklet-agnostic 3D page-turn: takes an index + a renderPage(index, scale)
// callback, knows nothing about PageCanvas/booklet data. Two-layer CSS-flip
// trick — a static base layer (the destination page) sits under an animated
// flip layer (the source page) that rotates away via @keyframes defined in
// src/index.css; `backface-visibility: hidden` lets the base layer show
// through once the flip layer passes 90deg. Pure CSS animation, no library.
export function PageFlip({
  pageCount,
  currentIndex,
  onIndexChange,
  renderPage,
  children,
}: PageFlipProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scale = useCanvasScale(containerRef);
  const [flip, setFlip] = useState<FlipState | null>(null);
  const dragStartXRef = useRef<{ pointerId: number; x: number; captured: boolean } | null>(null);

  const startFlip = useCallback(
    (direction: FlipDirection) => {
      if (flip) return;
      const toIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      if (toIndex < 0 || toIndex >= pageCount) return;

      // Computed fresh rather than cached in a ref — the user's OS-level
      // setting can change while the reader stays open.
      if (prefersReducedMotion()) {
        onIndexChange(toIndex);
        return;
      }
      setFlip({ direction, fromIndex: currentIndex, toIndex });
    },
    [flip, currentIndex, pageCount, onIndexChange],
  );

  function finishFlip() {
    if (!flip) return;
    onIndexChange(flip.toIndex);
    setFlip(null);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') startFlip('next');
      else if (event.key === 'ArrowLeft') startFlip('prev');
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startFlip]);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (flip) return;
    // Capture is deferred to handlePointerMove, once real drag movement is
    // confirmed — see DRAG_CAPTURE_THRESHOLD_PX. Capturing here unconditionally
    // would redirect every click in the canvas (including word-click TTS) to
    // this container instead of the element under the pointer.
    dragStartXRef.current = { pointerId: event.pointerId, x: event.clientX, captured: false };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragStartXRef.current;
    if (!drag || drag.pointerId !== event.pointerId || drag.captured) return;
    if (Math.abs(event.clientX - drag.x) >= DRAG_CAPTURE_THRESHOLD_PX) {
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.captured = true;
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const drag = dragStartXRef.current;
    dragStartXRef.current = null;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.x;
    const width = containerRef.current?.clientWidth ?? 0;
    const threshold = Math.min(SWIPE_THRESHOLD_PX, width * SWIPE_THRESHOLD_RATIO);
    if (Math.abs(deltaX) < threshold) return;
    startFlip(deltaX < 0 ? 'next' : 'prev');
  }

  const displayIndex = flip ? flip.toIndex : currentIndex;

  return (
    <>
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: READER_MAX_WIDTH,
          aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
          overflow: 'hidden',
          touchAction: 'pan-y',
          perspective: PAGE_FLIP_PERSPECTIVE_PX,
        }}
      >
        <div style={{ position: 'absolute', inset: 0 }}>{renderPage(displayIndex, scale)}</div>

        {flip && (
          <div
            key={`${flip.fromIndex}-${flip.direction}`}
            className={`page-flip-layer ${flip.direction === 'next' ? 'page-flip-layer--next' : 'page-flip-layer--prev'}`}
            style={{
              animationDuration: `${PAGE_FLIP_DURATION_MS}ms`,
              animationTimingFunction: PAGE_FLIP_EASING,
            }}
            onAnimationEnd={finishFlip}
          >
            {renderPage(flip.fromIndex, scale)}
            <div
              className="page-flip-shadow"
              style={
                {
                  animationDuration: `${PAGE_FLIP_DURATION_MS}ms`,
                  animationTimingFunction: PAGE_FLIP_EASING,
                  '--page-flip-shadow-max': PAGE_FLIP_SHADOW_MAX_OPACITY,
                } as CSSProperties
              }
            />
          </div>
        )}
      </div>

      {children?.({
        next: () => startFlip('next'),
        prev: () => startFlip('prev'),
        isFlipping: flip !== null,
      })}
    </>
  );
}
