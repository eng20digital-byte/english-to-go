import { useRef, type CSSProperties, type PointerEvent } from 'react';
import { useCanvasScale } from '@/renderer/useCanvasScale';
import { PageCanvas } from '@/renderer/PageCanvas';
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

// Owned by ReaderBookletPage; mirrored here so BookCover can switch layouts.
type CoverState = 'closed' | 'opening' | 'closing' | 'open';

interface BookCoverProps {
  cover: ReaderBookletPage;
  // The first spread (open-book page 0), revealed under the cover as it opens.
  firstSpread: ReaderBookletPage;
  // Number of spreads behind the cover — drives the closed-book fore-edge stack
  // width (one sheet per spread), so the shut book looks as thick as it reads.
  spreadCount: number;
  coverState: CoverState;
  onOpen: () => void;
  // Fired when the open animation lands (leaf finished rotating) so the parent
  // can switch to the live open book.
  onOpenEnd: () => void;
  // Fired when the close animation lands (leaf finished rotating back) so the
  // parent can settle on the centered closed cover.
  onCloseEnd: () => void;
}

// Matches the open-book card's contain-style box in ReaderBookletPage, so the
// cover (closed or animating) occupies exactly the box PageFlip takes over — no
// seam, no scale jump, by construction.
const SPREAD_ASPECT = (CANVAS_WIDTH / CANVAS_HEIGHT).toFixed(4);

// Closed-cover stage of the reader (C3.2) plus its open animation (C3.3) and
// re-close animation (C3.4). Renders through the SHARED PageCanvas, never a fork.
//
// ONE tree for every state (C4.1) — `closed` / `opening` / `closing` differ only
// by className + a couple of inline style toggles, so `closed → opening` (and the
// reverse) reconcile in place with no remount flash at the handoff:
//
//   • The OUTER box is the open-book wrapper's exact contain-style box
//     (`flex:1` + the same `maxWidth`), so flexbox resolves the full-spread width
//     identically — the cover then matches the open book's right page BY
//     CONSTRUCTION (the same "alignment guaranteed by construction" principle the
//     shared renderer relies on), which is what fixes the old closed-cover
//     oversizing/bottom-clip bug.
//   • The CARD is always the full spread (`aspectRatio 1920/1080`). The CLOSED
//     framing is simply the held first frame of `book-cover-expand`
//     (`clip-path: inset(0 0 0 50%)` + `translateX(-25%)`): the card's right half,
//     shown centered at box [25%..75%] — exactly half-page-sized. Opening/closing
//     hand that framing to the keyframes (clip-path un-clips, the card re-centers)
//     while the cover LEAF rotates around the spine (reused PageFlip leaf).
//
// Reduced motion skips the animated stages (parent jumps straight to
// 'open'/'closed') and still lands on this correctly-sized centered card.
export function BookCover({
  cover,
  firstSpread,
  spreadCount,
  coverState,
  onOpen,
  onOpenEnd,
  onCloseEnd,
}: BookCoverProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isOpening = coverState === 'opening';
  const isClosing = coverState === 'closing';
  // 'opening' and 'closing' share the full-spread animating framing (the latter
  // just plays the reverse keyframes); 'closed' holds the static first frame.
  const isAnimating = isOpening || isClosing;
  const isClosed = coverState === 'closed';
  // One basis for every state: the card is always the full spread, so it always
  // scales against the full canvas width. The cover face (a half-width leaf with
  // the COVER canvas) shares this same scale — half the card ⇒ half the canvas.
  const scale = useCanvasScale(cardRef, CANVAS_WIDTH);

  // Pointer tracking: a tap or a leftward swipe opens; a rightward swipe (there's
  // nothing before the cover) is ignored. Mirrors PageFlip's swipe thresholds.
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
    // Rightward swipe past the threshold → ignore; everything else (tap or
    // leftward swipe) opens.
    if (deltaX > threshold) return;
    onOpen();
  }

  // Shared by both leaf faces: same opacity ramp (peaks edge-on at 90deg), so
  // only the currently-visible face's shade is ever seen. Mirrors PageFlip.
  // While the cover rests closed the leaf is static, so suppress the shade's
  // one-shot mount pulse (`animation-name: none`) — otherwise the still cover
  // would darken once on load. The animating stages let the CSS default run.
  // Open and close are both SIMULTANEOUS (card reframe + leaf flip run together
  // over the same duration), so the shade runs with no delay in either.
  const shadeStyle = {
    animationDuration: `${PAGE_FLIP_DURATION_MS}ms`,
    animationTimingFunction: PAGE_FLIP_EASING,
    '--page-flip-shade-max': PAGE_FLIP_SHADOW_MAX_OPACITY,
    animationName: isAnimating ? undefined : 'none',
  } as CSSProperties;

  // Card framing. CLOSED = the held first frame of book-cover-expand (right half,
  // centered). While animating the keyframes own clip-path/transform, so we leave
  // them unset and only attach the animation class.
  const cardAnimClass = isOpening
    ? 'book-cover-card--opening'
    : isClosing
      ? 'book-cover-card--closing'
      : '';
  const leafClass = isOpening
    ? 'page-flip-sheet--next'
    : isClosing
      ? 'page-flip-sheet--prev'
      : '';
  // The fore-edge stack rides the card's expanding/collapsing right edge (box
  // 75% ⇄ 100%) so it never disappears mid-transition — see the stack render
  // below and the `book-cover-edge-*` keyframes in src/index.css.
  const edgeAnimClass = isOpening
    ? 'book-cover-edge--opening'
    : isClosing
      ? 'book-cover-edge--closing'
      : '';
  const leafAnimName = isOpening ? 'page-turn-next' : 'page-turn-prev';
  const onLeafEnd = isOpening ? onOpenEnd : onCloseEnd;

  const sheetVar = {
    '--book-sheet-thickness': `${BOOK_SHEET_THICKNESS_PX}px`,
  } as CSSProperties;

  return (
    <div
      // Tap/swipe-to-open only while closed — the animation can't be interrupted
      // mid-flight, so no handlers (or pointer affordances) during opening/closing.
      role={isClosed ? 'button' : undefined}
      aria-label={isClosed ? 'Open booklet' : undefined}
      onPointerDown={isClosed ? handlePointerDown : undefined}
      onPointerUp={isClosed ? handlePointerUp : undefined}
      style={{
        position: 'relative',
        flex: 1,
        // The open-book wrapper's exact box (ReaderBookletPage) — the source of
        // the by-construction size match.
        maxWidth: `min(${READER_MAX_WIDTH}px, calc((100vh - 40px) * ${SPREAD_ASPECT}))`,
        ...(isClosed ? { cursor: 'pointer', touchAction: 'pan-y' as const } : null),
      }}
    >
      {/* Thick-book fore-edge stack (right side). The card is clipped to its right
          half, so chrome can't live inside it — it would be clipped away; rendered
          as a sibling in the unclipped outer box at the visible cover's right edge.
          It must stay visible THROUGHOUT the open/close transition, not only while
          closed: PageFlip (which supplies the open book's own edge stacks) is
          unmounted for the entire 'opening'/'closing' stage, so a closed-only stack
          would vanish for the whole animation. As the card expands to the full
          spread its right edge sweeps from box 75% to box 100%; the stack rides
          along via book-cover-edge-open/close (same --dur/--easing as the card's
          book-cover-expand), landing flush with where PageFlip's own right stack
          picks up at the 'open' handoff. */}
      {spreadCount > 0 && (
        <div
          className={`book-edge book-edge--right ${edgeAnimClass}`}
          style={{
            ...sheetVar,
            position: 'absolute',
            // Closed: the visible cover's right edge is box 75%; the stack sits just
            // outside it. While animating the keyframes take over `left`, sweeping
            // it to box 100% (the full-spread right edge) and back.
            left: '75%',
            top: 0,
            bottom: 0,
            width: spreadCount * BOOK_SHEET_THICKNESS_PX,
            ...(isAnimating
              ? {
                  animationDuration: `${PAGE_FLIP_DURATION_MS}ms`,
                  animationTimingFunction: PAGE_FLIP_EASING,
                }
              : null),
          }}
        />
      )}

      {/* The full-spread card. CLOSED holds book-cover-expand's first frame inline
          (right half, centered); animating hands clip-path/transform to the
          keyframes via cardAnimClass. perspective lives here (the leaf's direct
          parent) so the fold reads in 3D.
          HARD RULE: clip-path / transform stay on THIS card only — never the leaf,
          where they would flatten the fold (see `.page-flip-sheet`). */}
      <div
        ref={cardRef}
        className={cardAnimClass}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
          // Without this the card grows to its min-content height: the base
          // PageCanvas is an in-flow child whose LAYOUT box is the full 1920×1080
          // canvas (transform: scale only shrinks it visually, not its layout),
          // so 1080px would override aspectRatio and make the cover taller than
          // the open book at any sub-1920 width. overflow:hidden lets aspectRatio
          // win (height = scaled width ÷ ratio), matching the open book BY
          // CONSTRUCTION — same as PageFlip's container, which pairs it with the
          // identical perspective + 3D leaf flip below, so it's proven safe here.
          overflow: 'hidden',
          borderRadius: 1,
          boxShadow: '0 24px 64px rgba(0,0,0,0.28), 0 8px 24px rgba(0,0,0,0.16)',
          perspective: PAGE_FLIP_PERSPECTIVE_PX,
          // --dur drives both the open expand and the close collapse — each runs
          // simultaneously with the cover leaf's flip over the same duration.
          '--dur': `${PAGE_FLIP_DURATION_MS}ms`,
          '--easing': PAGE_FLIP_EASING,
          // Held first frame of book-cover-expand while closed; the keyframes own
          // these during the animated stages.
          clipPath: isAnimating ? undefined : 'inset(0 0 0 50%)',
          transform: isAnimating ? undefined : 'translateX(-25%)',
        } as CSSProperties}
      >
        {/* Base — spread 0, revealed underneath as the leaf lifts off it.
            The LEFT page must NEVER come from the base while the cover leaf is
            animating: in a real book the inside-left page rides the cover's back
            face as it swings (in on open, out on close), never popping/lingering
            flat alongside it. So while opening OR closing we clip the base to its
            RIGHT half — the left side shows only the reader background, and the
            left page is delivered solely by the cover leaf's back face (below,
            which renders that same left page) as it rotates over it. Without the
            CLOSE clip, once the leaf swung past edge-on the un-clipped base left
            page lingered flat to the left of the cover instead of clearing to
            background. Full spread only at the closed settle and the seam-free
            'open' handoff to PageFlip (leaf back face = base left page there). */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            clipPath: isAnimating ? 'inset(0 0 0 50%)' : undefined,
          }}
        >
          <PageCanvas page={firstSpread} scale={scale} renderMode="reader" />
        </div>

        {/* Permanent book spine — only while animating/settled at the full spread.
            While closed it would double with the `.book-cover-spine` sibling (both
            land on the visible cover's left edge, box 25%), so it's dropped there. */}
        {isAnimating && <div className="book-spine" />}

        {/* The cover leaf — half-width sheet hinged on the spine. Closed: class
            `page-flip-sheet` only, so it rests flat at rotateY(0) showing the cover
            (no auto-flip on mount). Opening: 0°→-180° (page-turn-next); closing:
            -180°→0° (page-turn-prev). Reuses PageFlip's leaf so the geometry is
            identical at handoff. */}
        <div
          className={`page-flip-sheet ${leafClass}`}
          style={{
            animationDuration: `${PAGE_FLIP_DURATION_MS}ms`,
            animationTimingFunction: PAGE_FLIP_EASING,
            // Open and close both run the leaf flip SIMULTANEOUSLY with the card
            // reframe (no delay) — the cover slides into / out of the right-page
            // slot at the same time as it folds open / shut, so the two are
            // mirror images of each other.
          }}
          // The leaf, both shades and the card all run the same duration, so
          // filter to the leaf's own rotation keyframe — otherwise a shade's
          // animationend (it bubbles up from the faces) would fire the
          // open/close callback early/repeatedly. Inert while closed (no anim).
          onAnimationEnd={(event) => {
            if (event.animationName === leafAnimName) onLeafEnd();
          }}
        >
          {/* Front face = the cover. The leaf is exactly cover-sized (half the
              full-spread card), so the cover fills it with no 200% re-expand. */}
          <div className="page-flip-face page-flip-face--front">
            <PageCanvas
              page={cover}
              scale={scale}
              renderMode="reader"
              canvasWidth={COVER_CANVAS_WIDTH}
              canvasHeight={COVER_CANVAS_HEIGHT}
            />
            <div className="page-flip-shade" style={shadeStyle} />
          </div>

          {/* Back face = spread 0's LEFT page (200% wrapper anchored left:0,
              clipped to its left half) — same construction as PageFlip's back
              face, so once the leaf passes 90deg the frame reads as spread 0. */}
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
              <PageCanvas page={firstSpread} scale={scale} renderMode="reader" />
            </div>
            <div className="page-flip-shade page-flip-shade--back" style={shadeStyle} />
          </div>
        </div>
      </div>

      {/* Left binding/spine shadow (closed frame only). Sibling over the card at
          the visible cover's left edge (box 25%); pointer-inert so tap/swipe still
          fires. Rendered after the card so it overlays it. */}
      {isClosed && (
        <div
          className="book-cover-spine"
          style={{ position: 'absolute', left: '25%', top: 0, bottom: 0 }}
        />
      )}
    </div>
  );
}
