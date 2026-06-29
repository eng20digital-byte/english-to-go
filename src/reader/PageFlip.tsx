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
import { usePageFlipSound } from './usePageFlipSound';
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

// Booklet-agnostic 3D book page-turn (book-in-centre fold). Each booklet page
// index is a full 1920x1080 canvas (renderPage(index, scale)); the flip treats
// each canvas as a two-page spread by isolating its halves around the centre
// spine. Only the RIGHT HALF turns, as a rigid half-width leaf hinged on the
// spine — the Western/LTR convention (next = leaf swings leftward off the spine).
//
// Layers (see src/index.css and docs/flip-milestones/):
//   • base   — two full-canvas divs, each clip-path'd to one side of the spine:
//              the left half stays put; the right half is the page revealed
//              under the lifting leaf.
//   • sheet  — the turning leaf (left:50%; width:50%; transform-style:
//              preserve-3d), with two backface-hidden faces. The front face
//              always presents a RIGHT half, the back always a LEFT half; which
//              page index feeds each flips with direction (see the table in
//              docs/flip-milestones/README.md).
//
// The back face matches the destination's left half, so once the leaf passes
// 90deg (front becomes invisible) the whole frame reads as one coherent spread
// — in both directions, no half-page seams, no wrong backside covering the
// view. Pure CSS keyframes, no library.
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
  const playFlipSound = usePageFlipSound();

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
      playFlipSound();
      setFlip({ direction, fromIndex: currentIndex, toIndex });
    },
    [flip, currentIndex, pageCount, onIndexChange, playFlipSound],
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

  // Book-in-centre split. The left half is always static; the right half is the
  // folding leaf revealing the page underneath.
  //   leftBaseIndex  — left half always shows the LEFT side of the page that
  //                    stays on the left (source on a next-flip, destination on
  //                    a prev-flip).
  //   rightBaseIndex — shown under the folding leaf: the right half of the page
  //                    being revealed.
  const leftBaseIndex = flip
    ? flip.direction === 'next'
      ? flip.fromIndex
      : flip.toIndex
    : currentIndex;
  const rightBaseIndex = flip
    ? flip.direction === 'next'
      ? flip.toIndex
      : flip.fromIndex
    : currentIndex;
  // The folding leaf's two faces. The front face ALWAYS presents a RIGHT half,
  // the back face ALWAYS a LEFT half — only which page index feeds each face
  // flips with direction (see the table in docs/flip-milestones/README.md):
  //   next: front = fromIndex (leaving), back = toIndex   (arriving)
  //   prev: front = toIndex   (arriving), back = fromIndex (leaving)
  // The back face matches the left base panel's destination, so once the leaf
  // passes 90deg the frame reads as one coherent page — in both directions.
  const frontIndex = flip ? (flip.direction === 'next' ? flip.fromIndex : flip.toIndex) : null;
  const backIndex = flip ? (flip.direction === 'next' ? flip.toIndex : flip.fromIndex) : null;

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
        {/* Base layer — two full-canvas pages, each isolated to one side of the
            spine by clip-path (replacing the old 50%-panel + shifted-200%-wrapper
            trick). renderPage always emits a full-width page; clip-path crops it
            to the half that belongs on that side, lined up exactly on the spine.
            clip-path is safe here: these are flat divs, not preserve-3d parents. */}
        {/* LEFT background — left half of the page staying on the left. */}
        <div style={{ position: 'absolute', inset: 0, clipPath: 'inset(0 50% 0 0)' }}>
          {renderPage(leftBaseIndex, scale)}
        </div>

        {/* RIGHT background — right half of the page revealed under the leaf. */}
        <div style={{ position: 'absolute', inset: 0, clipPath: 'inset(0 0 0 50%)' }}>
          {renderPage(rightBaseIndex, scale)}
        </div>

        {/* Permanent book spine shadow down the canvas midpoint */}
        <div className="book-spine" />

        {flip && frontIndex !== null && backIndex !== null && (
          <>
            {/* Gutter shadow cast into the spine (right half) as the leaf lifts */}
            <div
              className="page-flip-gutter"
              style={{
                animationDuration: `${PAGE_FLIP_DURATION_MS}ms`,
                animationTimingFunction: PAGE_FLIP_EASING,
              }}
            />

            {/* The folding leaf: half-width sheet hinged on the spine (its own
                left edge = canvas centre), holding both faces in the same 3D
                space. Each face renders a full page inside an offset wrapper so
                only the correct half is visible. */}
            <div
              key={`${flip.fromIndex}-${flip.direction}`}
              className={`page-flip-sheet page-flip-sheet--${flip.direction}`}
              style={{
                animationDuration: `${PAGE_FLIP_DURATION_MS}ms`,
                animationTimingFunction: PAGE_FLIP_EASING,
              }}
              onAnimationEnd={finishFlip}
            >
              {/* Front face — RIGHT half of the leaving/arriving page. The inner
                  wrapper re-expands the page to true canvas size (left:-100%;
                  width:200% of this 50%-canvas face) and clip-path isolates its
                  right half into the face window. */}
              <div className="page-flip-face page-flip-face--front">
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '200%',
                    height: '100%',
                    clipPath: 'inset(0 0 0 50%)',
                  }}
                >
                  {renderPage(frontIndex, scale)}
                </div>
                <div className="page-flip-shade" style={shadeStyle} />
              </div>

              {/* Back face — the reverse of the leaf. The leaf hinges on the
                  spine and at -180deg lays over the canvas's LEFT half, so this
                  face ends up covering the left half at completion; to stay
                  coherent it must present the arriving page's LEFT half there.
                  The face is CSS-pre-rotated 180deg (its own centre), which
                  mirrors its content; a 200%-wide wrapper anchored at left:0
                  (no shift) puts the page's left half into the face, and that
                  mirror + the leaf's -180deg rotation together land it
                  un-mirrored over the canvas left half — exactly matching the
                  destination page the left base panel will show once the flip
                  finishes. clip-path isolates the LEFT half into the face. */}
              <div className="page-flip-face page-flip-face--back">
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '200%',
                    height: '100%',
                    clipPath: 'inset(0 50% 0 0)',
                  }}
                >
                  {renderPage(backIndex, scale)}
                </div>
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
