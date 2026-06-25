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
  // Exposes next/prev to a parent that needs to render buttons outside this component's DOM tree.
  onControlsChange?: (controls: { next: () => void; prev: () => void }) => void;
  onIsFlippingChange?: (isFlipping: boolean) => void;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// Booklet-agnostic 3D book page-turn: takes an index + renderPage callback and
// turns one FULL page as a single rigid leaf hinged at the spine (the left
// edge), the Western/LTR convention (next = leaf swings leftward off the spine).
//
// Layers (see src/index.css):
//   • base   — the full page revealed behind the leaf (destination on a
//              next-flip, the still-current page on a prev-flip).
//   • sheet  — the turning leaf, transform-origin at the left edge,
//              transform-style: preserve-3d, two backface-hidden faces:
//                front = the page leaving the viewer (source on next),
//                back  = the SAME page the base shows.
//
// Because the back face always matches the base, once the leaf passes 90deg
// (front becomes invisible) the whole frame reads as one coherent destination
// page — no half-page seams, no wrong backside covering the view. Pure CSS
// keyframes, no library.
export function PageFlip({
  pageCount,
  currentIndex,
  onIndexChange,
  renderPage,
  children,
  onControlsChange,
  onIsFlippingChange,
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

  useEffect(() => {
    onControlsChange?.({ next: () => startFlip('next'), prev: () => startFlip('prev') });
  }, [startFlip, onControlsChange]);

  useEffect(() => {
    onIsFlippingChange?.(flip !== null);
  }, [flip, onIsFlippingChange]);

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

  // base  — full page revealed behind the leaf.
  // front — the page on the front of the turning leaf (visible < 90deg).
  // back  — the page on the back of the leaf; always equals `base`, so the
  //         frame stays a single coherent page once the leaf passes 90deg.
  const baseIndex = flip
    ? flip.direction === 'next'
      ? flip.toIndex
      : flip.fromIndex
    : currentIndex;
  const frontIndex = flip
    ? flip.direction === 'next'
      ? flip.fromIndex
      : flip.toIndex
    : null;
  const backIndex = flip
    ? flip.direction === 'next'
      ? flip.toIndex
      : flip.fromIndex
    : null;

  // Shared by both faces: same opacity ramp (peaks edge-on at 90deg), so only
  // the currently-visible face's shade is ever seen.
  const shadeStyle = {
    animationDuration: `${PAGE_FLIP_DURATION_MS}ms`,
    animationTimingFunction: PAGE_FLIP_EASING,
    '--page-flip-shade-max': PAGE_FLIP_SHADOW_MAX_OPACITY,
  } as CSSProperties;

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
        {/* Base — full page revealed behind the turning leaf */}
        <div style={{ position: 'absolute', inset: 0 }}>{renderPage(baseIndex, scale)}</div>

        {flip && frontIndex !== null && backIndex !== null && (
          <>
            {/* Gutter shadow cast into the spine as the leaf lifts off it */}
            <div
              className="page-flip-gutter"
              style={{
                animationDuration: `${PAGE_FLIP_DURATION_MS}ms`,
                animationTimingFunction: PAGE_FLIP_EASING,
              }}
            />

            {/* The turning leaf: one rigid sheet hinged at the spine (left
                edge), holding both faces in the same 3D space */}
            <div
              key={`${flip.fromIndex}-${flip.direction}`}
              className={`page-flip-sheet page-flip-sheet--${flip.direction}`}
              style={{
                animationDuration: `${PAGE_FLIP_DURATION_MS}ms`,
                animationTimingFunction: PAGE_FLIP_EASING,
              }}
              onAnimationEnd={finishFlip}
            >
              {/* Front face — the page leaving the viewer (< 90deg turned) */}
              <div className="page-flip-face page-flip-face--front">
                {renderPage(frontIndex, scale)}
                <div className="page-flip-shade" style={shadeStyle} />
              </div>

              {/* Back face — the reverse of the leaf; same page as the base,
                  so the view stays coherent once past 90deg */}
              <div className="page-flip-face page-flip-face--back">
                {renderPage(backIndex, scale)}
                <div className="page-flip-shade page-flip-shade--back" style={shadeStyle} />
              </div>
            </div>
          </>
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
