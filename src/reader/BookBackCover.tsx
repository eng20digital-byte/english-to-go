import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { useCanvasScale } from '@/renderer/useCanvasScale';
import { PageCanvas } from '@/renderer/PageCanvas';
import { QuizEmbed } from '@/quiz/QuizEmbed';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COVER_CANVAS_WIDTH,
  COVER_CANVAS_HEIGHT,
} from '@/config/canvas';
import {
  READER_MAX_WIDTH,
  BOOK_SHEET_THICKNESS_PX,
  PAGE_FLIP_DURATION_MS,
  PAGE_FLIP_EASING,
  PAGE_FLIP_PERSPECTIVE_PX,
  PAGE_FLIP_SHADOW_MAX_OPACITY,
  SWIPE_THRESHOLD_PX,
  SWIPE_THRESHOLD_RATIO,
} from '@/config/reader';
import type { ReaderBookletPage } from '@/hooks/useBookletQuery';

// Owned by ReaderBookletPage; mirrored here so BookBackCover can read state.
type BackCoverState = 'hidden' | 'entering' | 'exiting' | 'visible';

interface BookBackCoverProps {
  backCover: ReaderBookletPage;
  lastSpread: ReaderBookletPage;
  spreadCount: number;
  backCoverState: BackCoverState;
  onClose: () => void;
  onEnterEnd: () => void;
  onExitEnd: () => void;
  // Null/undefined when the booklet has no quiz configured for the back
  // cover — see ReaderBookletPage's `showQuizOnBackCover` gating.
  quizEmbedCode?: string | null;
}

const SPREAD_ASPECT = (CANVAS_WIDTH / CANVAS_HEIGHT).toFixed(4);

// Back cover reader component (B3.3 enter + B3.4 exit animations).
//
// ONE tree for all animated states — entering/exiting differ only by class
// names; no remount between states. The `visible` (static) state renders a
// simpler tree. Same one-tree principle as BookCover.
//
// ENTERING: leaf flip (180°→0°) and card collapse (full spread→portrait) run
//   SIMULTANEOUSLY over PAGE_FLIP_DURATION_MS — mirroring the front cover.
//   onEnterEnd fires on the CARD's back-cover-card-enter animationend.
//
// EXITING: card expand (portrait→full spread) and leaf flip (0°→180°) run
//   SIMULTANEOUSLY over PAGE_FLIP_DURATION_MS — mirror of entering.
//   onExitEnd fires on the LEAF's back-cover-leaf-exit animationend.
//
// Base clip: during both entering and exiting, the last spread base is clipped
// to its left half. The right page is delivered solely by the leaf's back face.
// The clip is removed once the component reaches the `visible` or `hidden` state.
export function BookBackCover({
  backCover,
  lastSpread,
  spreadCount,
  backCoverState,
  onClose,
  onEnterEnd,
  onExitEnd,
  quizEmbedCode,
}: BookBackCoverProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  // Card is always the full spread — same scale basis as the open book.
  const scale = useCanvasScale(cardRef, CANVAS_WIDTH);
  const [coverWidth, setCoverWidth] = useState(0);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    const updateSize = () => {
      setCoverWidth(element.getBoundingClientRect().width);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const isCompact = coverWidth > 0 && coverWidth < 420;
  const buttonWidth = isCompact ? Math.min(140, Math.max(82, coverWidth * 0.2)) : 220;
  const buttonBottom = isCompact ? Math.max(14, coverWidth * 0.09) : '25%';
  const buttonFontSize = isCompact ? 10 : 14;

  const isEntering  = backCoverState === 'entering';
  const isExiting   = backCoverState === 'exiting';
  const isVisible   = backCoverState === 'visible';
  const isAnimating = isEntering || isExiting;

  // Rightward swipe or tap → close (exit to last spread).
  const dragStartRef = useRef<{ pointerId: number; x: number } | null>(null);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    dragStartRef.current = { pointerId: event.pointerId, x: event.clientX };
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const drag = dragStartRef.current;
    dragStartRef.current = null;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.x;
    const width = event.currentTarget.clientWidth;
    const threshold = Math.min(SWIPE_THRESHOLD_PX, width * SWIPE_THRESHOLD_RATIO);
    // Leftward swipe → ignore (nothing after the back cover).
    if (deltaX < -threshold) return;
    // Rightward swipe or tap → exit to last spread.
    onClose();
  }

  // Shade animates in sync with the leaf flip (simultaneous, no delay).
  const shadeStyle: CSSProperties = {
    animationDuration: `${PAGE_FLIP_DURATION_MS}ms`,
    animationTimingFunction: PAGE_FLIP_EASING,
    '--page-flip-shade-max': PAGE_FLIP_SHADOW_MAX_OPACITY,
  } as CSSProperties;

  const sheetVar = {
    '--book-sheet-thickness': `${BOOK_SHEET_THICKNESS_PX}px`,
  } as CSSProperties;

  const cardClass = isEntering
    ? 'back-cover-card--entering'
    : isExiting
      ? 'back-cover-card--exiting'
      : '';
  const leafClass = isEntering
    ? 'back-cover-leaf--entering'
    : isExiting
      ? 'back-cover-leaf--exiting'
      : '';
  const edgeClass = isEntering
    ? 'back-cover-edge--entering'
    : isExiting
      ? 'back-cover-edge--exiting'
      : '';

  // Leaf runs simultaneously with the card — no delay in either direction.
  const leafStyle: CSSProperties = {
    animationDuration: `${PAGE_FLIP_DURATION_MS}ms`,
    animationTimingFunction: PAGE_FLIP_EASING,
  };

  // CSS vars + perspective used by both entering and exiting animations.
  // --dur drives both card reframe and leaf flip simultaneously (same duration).
  const cardVars = {
    '--dur':     `${PAGE_FLIP_DURATION_MS}ms`,
    '--easing':  PAGE_FLIP_EASING,
    perspective: PAGE_FLIP_PERSPECTIVE_PX,
  } as CSSProperties;

  return (
    <div
      role="button"
      aria-label="Close back cover"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      style={{
        position: 'relative',
        flex: 1,
        maxWidth: `min(${READER_MAX_WIDTH}px, calc((100vh - 40px) * ${SPREAD_ASPECT}))`,
        cursor: 'pointer',
        touchAction: 'pan-y',
      }}
    >
      {/* Left fore-edge stack: tracks the card's visible left edge.
          Entering: starts at right:100% (full spread), simultaneous with card.
          Exiting:  starts at right:75% (portrait), simultaneous with card. */}
      {isAnimating && spreadCount > 0 && (
        <div
          className={`book-edge book-edge--left ${edgeClass}`}
          style={{
            ...sheetVar,
            position: 'absolute',
            right: isEntering ? '100%' : '75%',
            top: 0,
            bottom: 0,
            width: spreadCount * BOOK_SHEET_THICKNESS_PX,
            animationDuration: `${PAGE_FLIP_DURATION_MS}ms`,
            animationTimingFunction: PAGE_FLIP_EASING,
          }}
        />
      )}

      {/* Full-spread card.
          ENTERING/EXITING: CSS vars + perspective own the animation; no inline
            clip or transform (keyframes supply the from/to values).
          VISIBLE: static portrait — card clipped to left half, re-centered.
          onEnterEnd fires on back-cover-card-enter end (card finishes last on enter).
          onExitEnd fires on back-cover-leaf-exit end (leaf finishes last on exit). */}
      <div
        ref={cardRef}
        className={cardClass}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
          overflow: 'hidden',
          borderRadius: 1,
          boxShadow: '0 24px 64px rgba(0,0,0,0.28), 0 8px 24px rgba(0,0,0,0.16)',
          ...(isAnimating
            ? cardVars
            : {
                clipPath: 'inset(0 50% 0 0)',
                transform: 'translateX(25%)',
              }),
        } as CSSProperties}
        onAnimationEnd={(event) => {
          if (event.animationName === 'back-cover-card-enter') onEnterEnd();
        }}
      >
        {isAnimating ? (
          <>
            {/* Base: last spread, clipped to LEFT half during all animation.
                Right page comes only from the leaf's back face — never the base. */}
            <div style={{ position: 'absolute', inset: 0, clipPath: 'inset(0 50% 0 0)' }}>
              <PageCanvas page={lastSpread} scale={scale} renderMode="reader" />
            </div>

            {/* Permanent book spine */}
            <div className="book-spine" />

            {/* Back cover leaf: left half of the spread, pivots at the spine
                (right edge). Entering: 180° → 0°. Exiting: 0° → 180° (delayed). */}
            <div
              className={`back-cover-leaf ${leafClass}`}
              style={leafStyle}
              onAnimationEnd={(event) => {
                if (event.animationName === 'back-cover-leaf-exit') onExitEnd();
              }}
            >
              {/* Front face: back cover design. Faces viewer at rotateY(0). */}
              <div className="page-flip-face page-flip-face--front">
                <PageCanvas
                  page={backCover}
                  scale={scale}
                  renderMode="reader"
                  canvasWidth={COVER_CANVAS_WIDTH}
                  canvasHeight={COVER_CANVAS_HEIGHT}
                />
                <div className="back-cover-shade" style={shadeStyle} />
              </div>

              {/* Back face: last spread's right page. 200% wrapper anchored
                  right:0 (spine side), clipped to its right 50%. */}
              <div className="page-flip-face page-flip-face--back">
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '200%',
                    height: '100%',
                    clipPath: 'inset(0 0 0 50%)',
                  }}
                >
                  <PageCanvas page={lastSpread} scale={scale} renderMode="reader" />
                </div>
                <div className="back-cover-shade back-cover-shade--back" style={shadeStyle} />
              </div>
            </div>
          </>
        ) : (
          /* Visible state: static back cover portrait (B3.2 framing).
             Card clip-path/transform are set inline on the card above. */
          <PageCanvas
            page={backCover}
            scale={scale}
            renderMode="reader"
            canvasWidth={COVER_CANVAS_WIDTH}
            canvasHeight={COVER_CANVAS_HEIGHT}
          />
        )}
      </div>

      {/* Right-side spine shadow while the back cover is in the static visible
          state. Binding edge is on the RIGHT (opposite the front cover's left).
          right:25% puts the shadow's right edge at the card's visible right
          edge (the clipped portrait occupies 25%–75% of the container). */}
      {isVisible && (
        <div
          className="book-back-cover-spine"
          style={{ position: 'absolute', right: '25%', top: 0, bottom: 0 }}
        />
      )}

      {/* Desktop: large, bold, centered near the lower quarter of the cover.
          Phone: compact mode, still aligned to the cover but much tighter. */}
      {isVisible && quizEmbedCode && (
        <div
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          style={{
            position: 'absolute',
            left: '50%',
            bottom: isCompact ? `${buttonBottom}px` : buttonBottom,
            zIndex: 5,
            cursor: 'default',
            transform: 'translateX(-50%)',
            width: `${buttonWidth}px`,
            maxWidth: isCompact ? '100px' : '220px',
            pointerEvents: 'auto',
            display: 'inline-block',
            fontSize: `${buttonFontSize}px`,
            lineHeight: 1.15,
          }}
        >
          <QuizEmbed embedCode={quizEmbedCode} compact={isCompact} />
        </div>
      )}
    </div>
  );
}
