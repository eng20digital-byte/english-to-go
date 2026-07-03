import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, BookOpen, BookX, Volume2 } from 'lucide-react';
import { useBookletByToken } from '@/hooks/useBookletQuery';
import { PageCanvas } from '@/renderer/PageCanvas';
import { WordSpeechProvider } from '@/tts/useWordSpeech';
import { SpeechRateControl } from '@/tts/SpeechRateControl';
import { QuizEmbed } from '@/quiz/QuizEmbed';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/canvas';
import {
  READER_MAX_WIDTH,
  READER_MOBILE_BREAKPOINT,
  READER_MOBILE_RAIL_RESERVE_PX,
  BOOK_SHEET_THICKNESS_PX,
  // BOOK_STACK_DEPTH_INSET_PCT,
  SWIPE_THRESHOLD_PX,
  SWIPE_THRESHOLD_RATIO,
} from '@/config/reader';
import { SIDEBAR_PANEL_GAP } from '@/config/vocabulary';
import { useViewportWidth } from './useViewportWidth';
import { PageFlip } from './PageFlip';
import { VocabularyPanel } from './VocabularyPanel';
import { CreditsPanel } from './CreditsPanel';
import { BookCover } from './BookCover';
import { BookBackCover } from './BookBackCover';
import { usePagePreloader } from './useNextPagePreloader';
import { useCoverImageReady } from './useCoverImageReady';
import { prefersReducedMotion } from './prefersReducedMotion';
import { ReaderBgShapes } from './ReaderBgShapes';
import { ReaderLoadingState } from './ReaderLoadingState';
import { ReaderError } from './ReaderError';
import { NavArrow } from './NavArrow';
import { useReaderKeyboard } from './useReaderKeyboard';
import { BRAND } from '@/config/theme';

// Dots for ≤12 pages; progress bar for longer booklets.
const DOT_NAV_MAX = 12;

// Closed-cover lifecycle. C3.2 ships only the instant 'closed' → 'open' path
// (which doubles as the prefers-reduced-motion path); 'opening'/'closing' are
// reserved for the animated transitions layered on in C3.3/C3.4.
type CoverState = 'closed' | 'opening' | 'closing' | 'open';
type BackCoverState = 'hidden' | 'entering' | 'exiting' | 'visible';

// Public reader — fullscreen presentation mode.
//
// Layout: one flex column child (the booklet area) that fills the full
// viewport minus a 3vw horizontal + 20px vertical margin. All UI chrome is
// overlaid directly on the booklet card so nothing competes with its size:
//
//   NW edge   — collapsible D-tab: half-circle speaker button → slides open
//               rightward to reveal the speed-rate slider panel
//   W / E     — prev / next page overlay buttons
//   S center  — dot/progress indicator + page counter, dark frosted pill
//
// READER_MAX_WIDTH matches the canvas native width (1920), so `maxWidth` only
// clips on ultrawide monitors; everything else is bounded by the 3vw margin.
// PageFlip's internal canvas div also references READER_MAX_WIDTH, keeping
// both bounding boxes identical — overflow:hidden rounded corners stay correct.
export function ReaderBookletPage() {
  const { token } = useParams<{ token: string }>();
  const { data: booklet, isLoading, isError } = useBookletByToken(token);
  // Compact chrome on narrow screens (0 during SSR ⇒ treat as desktop). Shrinks
  // the viewer padding, nav arrows, and gap so the book card gets more width.
  const viewportWidth = useViewportWidth();
  const isMobile = viewportWidth > 0 && viewportWidth < READER_MOBILE_BREAKPOINT;
  const [pageIndex, setPageIndex] = useState(0);
  const [prevHover, setPrevHover] = useState(false);
  const [nextHover, setNextHover] = useState(false);
  const [hoveredDot, setHoveredDot] = useState<number | null>(null);
  const [speechExpanded, setSpeechExpanded] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  // Incrementing pulse that tells the self-owned left-edge panels (dictionary,
  // credits) to collapse. The speech-rate panel's open state lives here, so
  // it's reset directly; see the page-turn effect below.
  const [panelCloseSignal, setPanelCloseSignal] = useState(0);
  const [coverState, setCoverState] = useState<CoverState>('closed');
  const [backCoverState, setBackCoverState] = useState<BackCoverState>('hidden');
  // Reset to closed/hidden whenever the booklet changes (new token / refetch),
  // via the render-phase "adjust state on prop change" pattern — no setState-in-effect.
  const [prevBookletId, setPrevBookletId] = useState(booklet?.id);
  if (booklet?.id !== prevBookletId) {
    setPrevBookletId(booklet?.id);
    setCoverState('closed');
    setBackCoverState('hidden');
  }
  const flipControlsRef = useRef<{ next: () => void; prev: () => void } | null>(null);
  // Tracks a pointer drag on the book wrapper, used only to detect a
  // swipe-right-to-close gesture at spread 0 (see handleWrapperPointerUp).
  const coverSwipeRef = useRef<{ pointerId: number; x: number } | null>(null);
  const handleControlsChange = useCallback(
    (controls: { next: () => void; prev: () => void }) => { flipControlsRef.current = controls; },
    [],
  );
  // Reduced motion (or no support) jumps straight to the open book — the C3.2
  // baseline; otherwise play the C3.3 open animation via the 'opening' stage,
  // which BookCover ends by calling onOpenEnd → 'open'.
  const openCover = useCallback(() => {
    setCoverState(prefersReducedMotion() ? 'open' : 'opening');
  }, []);
  const finishOpen = useCallback(() => setCoverState('open'), []);
  // Re-close from spread 0 (C3.4): reverse of openCover. Reduced motion jumps
  // straight back to 'closed'; otherwise the 'closing' stage plays BookCover's
  // reverse animation, ended by onCloseEnd → 'closed'.
  const closeCover = useCallback(() => {
    setCoverState(prefersReducedMotion() ? 'closed' : 'closing');
  }, []);
  const finishClose = useCallback(() => setCoverState('closed'), []);

  // Back cover state machine (B3.3 — enter animation).
  // Reduced motion skips straight to 'visible'; otherwise plays 'entering'
  // (flip + reframe), which ends when the card animation fires onEnterEnd.
  const enterBackCover = useCallback(() => {
    setBackCoverState(prefersReducedMotion() ? 'visible' : 'entering');
  }, []);
  const finishEntering = useCallback(() => setBackCoverState('visible'), []);
  const exitBackCover = useCallback(() => {
    setBackCoverState(prefersReducedMotion() ? 'hidden' : 'exiting');
  }, []);
  const finishExiting = useCallback(() => setBackCoverState('hidden'), []);

  const showBackCover = backCoverState !== 'hidden';

  useEffect(() => {
    if (booklet) document.title = booklet.title;
  }, [booklet]);

  usePagePreloader(booklet, pageIndex);
  const coverImageReady = useCoverImageReady(booklet);

  // Arrow-key navigation for the cover / back-cover transitions (open, close,
  // enter, exit) — one listener, each action keeping its original guard. See
  // useReaderKeyboard. Declared before the early returns (hooks rule); it
  // recomputes its guards from the loaded booklet. PageFlip owns arrow keys only
  // while the open book shows, and each case here is guarded on !showCover /
  // !showBackCover, so there's no conflict.
  useReaderKeyboard({
    booklet,
    coverState,
    pageIndex,
    showBackCover,
    isFlipping,
    onOpenCover: openCover,
    onCloseCover: closeCover,
    onEnterBackCover: enterBackCover,
    onExitBackCover: exitBackCover,
  });

  // Auto-close every open left-edge side panel (dictionary, speech-rate,
  // credits) the moment the reader turns a page, so a flip never leaves a panel
  // hovering over the new spread. `isFlipping` catches animated turns from any
  // source (button / keyboard / swipe) at their start; `pageIndex` catches
  // instant jumps (dot nav, progress bar, reduced-motion). `coverState` /
  // `backCoverState` catch flips to/from the covers — those are driven by their
  // own state machines, never touching `pageIndex` or PageFlip's `isFlipping`,
  // so without them an open panel (e.g. Credits, which renders over the covers
  // too) would survive a cover open/close or back-cover enter/exit. Funnelling
  // all of them through one effect gives the three panels a single shared close
  // trigger instead of each re-deriving "did we just flip?". Both closes are
  // idempotent, so the redundant fire when a transition settles is harmless.
  useEffect(() => {
    setSpeechExpanded(false);
    setPanelCloseSignal((n) => n + 1);
  }, [pageIndex, isFlipping, coverState, backCoverState]);

  if (isLoading) return <ReaderLoadingState />;
  if (isError) return <ReaderError icon={<AlertTriangle size={26} color="rgba(255,193,77,0.9)" />} message="Something went wrong loading this booklet. Please try again." />;
  if (!booklet) return <ReaderError icon={<BookX size={26} color="rgba(255,255,255,0.7)" />} message="This booklet could not be found. It may not be published or disabled" />;
  if (booklet.pages.length === 0) return <ReaderError icon={<BookOpen size={26} color="rgba(255,255,255,0.7)" />} message="This booklet has no pages yet." />;
  if (!coverImageReady) return <ReaderLoadingState />;

  // Split covers from spreads. All open-book logic drives on `spreads` only —
  // neither cover is counted in the dot indicator or page counter.
  const cover     = booklet.pages.find((p) => p.is_cover)      ?? null;
  const backCover = booklet.pages.find((p) => p.is_back_cover) ?? null;
  const spreads   = booklet.pages.filter((p) => !p.is_cover && !p.is_back_cover);

  // No-cover booklets ⇒ showCover is always false ⇒ they open straight to spread
  // 0 exactly as before, no flash, no init effect needed.
  const hasCover = cover !== null;
  const showCover = hasCover && coverState !== 'open';

  // Cover-only booklet: reuse the existing "no pages" empty state for now
  // (proper closed-only handling is left to C3.2).
  if (spreads.length === 0) return <ReaderError icon={<BookOpen size={26} color="rgba(255,255,255,0.7)" />} message="This booklet has no pages yet." />;

  const clampedIndex = Math.min(pageIndex, spreads.length - 1);
  // Quiz shows on the BACK COVER when the booklet-level flag is set. The column
  // is still named `show_quiz_on_last_spread` (its original placement, migration
  // 0008) — kept rather than renamed to avoid a column-churn migration; it now
  // simply gates the back-cover quiz. Gated on `visible` (not merely
  // `showBackCover`) so the heavy Fillout embed only mounts once the back cover
  // has settled, never mid-flip during the enter/exit animation. Requires the
  // booklet to actually have a back cover page.
  const showQuizOnBackCover =
    booklet.show_quiz_on_last_spread &&
    !!booklet.quiz_embed_code &&
    backCover !== null &&
    backCoverState === 'visible';
  const pageProgress = spreads.length > 1
    ? (clampedIndex / (spreads.length - 1)) * 100
    : 100;

  // Open at spread 0 of a cover booklet ⇒ prev re-closes the cover instead of
  // being a dead end. This is the one case where prev is enabled at index 0.
  const canClose = hasCover && coverState === 'open' && clampedIndex === 0;

  // While closed, prev is meaningless (nothing before the cover) and next opens
  // the cover rather than turning a page (see handleNext). At spread 0, prev is
  // disabled UNLESS it can re-close the cover.
  // While the back cover is showing: next is disabled (nothing after it), prev
  // exits to the last spread (enabled — handled in handlePrev).
  // Back cover prev always exits to last spread — never disabled (unless flipping
  // or cover still closed, both of which mean the back cover can't be showing).
  const prevDisabled = isFlipping || showCover || (!showBackCover && clampedIndex === 0 && !canClose);
  const nextDisabled =
    isFlipping ||
    showBackCover ||
    (!showCover && clampedIndex === spreads.length - 1 && !backCover);

  const handleNext = () => {
    if (showCover) return openCover();
    if (clampedIndex === spreads.length - 1 && backCover && !showBackCover) return enterBackCover();
    flipControlsRef.current?.next();
  };

  const handlePrev = () => {
    if (showBackCover) return exitBackCover();
    if (canClose) return closeCover();
    flipControlsRef.current?.prev();
  };

  // Swipe-right-to-close. PageFlip owns swipe and can't be touched, so we listen
  // on the book wrapper (an ancestor of PageFlip's container — pointer-capture
  // events still bubble up). Only act when `canClose` and the gesture is a
  // rightward swipe past the threshold; otherwise do nothing and let PageFlip
  // handle the gesture normally (no regression). Leftward/next swipes are always
  // ignored here.
  const handleWrapperPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    coverSwipeRef.current = { pointerId: event.pointerId, x: event.clientX };
  };
  const handleWrapperPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = coverSwipeRef.current;
    coverSwipeRef.current = null;
    if (!canClose || !drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.x;
    const width = event.currentTarget.clientWidth;
    const threshold = Math.min(SWIPE_THRESHOLD_PX, width * SWIPE_THRESHOLD_RATIO);
    if (deltaX > threshold) closeCover();
  };

  // Physical book thickness: page-stack edges flanking the open book, one thin
  // sheet per page. leftSheets = pages already turned, rightSheets = pages still
  // ahead; each stack's width is its sheet count × BOOK_SHEET_THICKNESS_PX, so
  // it thickens gradually and accurately as pages move from one side to the
  // other. Driven by the settled page (clampedIndex); each edge is rendered only
  // when its side has sheets (no transition), so a sheet shifts from the right
  // stack to the left the instant a page settles. The shared `--book-sheet-
  // thickness` var lets the fore-edge gradient draw one cut-line per sheet.
  // See src/config/reader.ts.
  const leftSheets = clampedIndex;
  const rightSheets = spreads.length - 1 - clampedIndex;
  const sheetVar = {
    '--book-sheet-thickness': `${BOOK_SHEET_THICKNESS_PX}px`,
  } as CSSProperties;

  return (
    <div
      id="reader-root"
      translate="no"
      style={{
        position: 'fixed', inset: 0,
        // Per-booklet background (migration 0005) — the reader's surrounding
        // backdrop behind the book card, configurable in the editor. Falls back
        // to the brand green for booklets predating the setting. The book pages
        // (PageCanvas) keep their own canvas background, unaffected.
        backgroundColor: booklet.background_color || BRAND.green,
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
      }}
    >
      <ReaderBgShapes />

      <WordSpeechProvider>
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* ── Viewer area ──────────────────────────────────────────────────
              position:relative anchors the speech panel. Nav arrows are in a
              flex row surrounding the booklet so they stay flush to its edges
              regardless of how the card scales. */}
          <div style={{
            flex: 1, minHeight: 0,
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            // On mobile the prev/next arrows move OUT of the flex row (where the
            // left side rail would cover the prev arrow on a narrow screen) and
            // into a centered bar pinned to the bottom of this viewer area; the
            // extra bottom padding reserves its space so the book never overlaps.
            // The symmetric horizontal padding reserves room for the left side
            // rail's peeking handles so the centered book shrinks to stay clear
            // of them instead of scaling underneath them on a narrow screen.
            padding: isMobile
              ? `12px ${READER_MOBILE_RAIL_RESERVE_PX}px 76px`
              : '20px 16px',
          }}>

            {/* ── Left sidebar rail ─────────────────────────────────────────
                Single vertical flex column spanning the full viewer height, so
                the three left-edge panels can NEVER overlap at any viewport
                size: the speaker is pinned to the TOP, the Credits to the
                BOTTOM, and the Dictionary fills the flexible middle (flex:1)
                between them. Because the middle is a flowed, flex-growing slot
                rather than a fixed-height box anchored to the top, it simply
                gets shorter on short screens instead of colliding with the
                bottom-pinned Credits — the collision the old top/bottom-anchor
                layout suffered from.

                alignItems:flex-start keeps each panel at its own (content) width
                pinned to the left edge — without it the column's default
                `stretch` would blow the auto-width panel roots out to full
                width and break their body+handle rows.

                pointerEvents:none on the column so the panels' wide,
                translateX-hidden DOM boxes don't block the prev/next nav
                underneath; each panel restores pointerEvents:auto on its own
                shifted root, so only the visible handle is clickable. */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 16,
                bottom: 24,
                zIndex: 25,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: SIDEBAR_PANEL_GAP,
                pointerEvents: 'none',
              }}
            >
              {/* ── Speech-rate panel (speaker) ──────────────────────────────
                  Collapsed: only the rightmost 60px (speaker button) is visible.
                  Expanded: the full panel slides into view (translateX(0)). */}
              <div
                style={{
                  transform: `translateX(${speechExpanded ? '0px' : '-180px'})`,
                  transition: 'transform 0.38s cubic-bezier(0.4, 0, 0.2, 1)',
                  width: 240,
                  height: 56,
                  flexShrink: 0,
                  backgroundColor: BRAND.cream,
                  borderRadius: 16,
                  boxShadow: '2px 4px 18px rgba(0,0,0,0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden',
                  pointerEvents: 'auto',
                }}
              >
                {/* Slider content — left portion, fades in as panel opens */}
                <div
                  style={{
                    flex: 1,
                    padding: '0 6px 0 14px',
                    opacity: speechExpanded ? 1 : 0,
                    transition: speechExpanded
                      ? 'opacity 0.22s ease 0.18s'
                      : 'opacity 0.08s ease 0s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <SpeechRateControl compact />
                </div>

                {/* Speaker toggle — rightmost 60px, always peeks out when collapsed */}
                <button
                  type="button"
                  aria-label={speechExpanded ? 'Close speed control' : 'Open speed control'}
                  onClick={() => setSpeechExpanded((v) => !v)}
                  style={{
                    width: 60, height: 56, flexShrink: 0,
                    backgroundColor: 'transparent',
                    border: 'none', cursor: 'pointer', padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: speechExpanded ? BRAND.green : BRAND.textMuted,
                    transition: 'color 0.2s',
                    fontFamily: 'inherit',
                  }}
                >
                  <Volume2 size={16} />
                </button>
              </div>

              {/* ── Dictionary slot (flexible middle) ────────────────────────
                  Always rendered (even when the Dictionary itself is hidden over
                  a cover, or empty) so its flex:1 growth reserves ALL the space
                  between the speaker and the credits — that's what keeps the
                  speaker top-pinned and the credits bottom-pinned regardless of
                  whether the Dictionary is currently shown. The VocabularyPanel
                  fills this slot's height, so its tall handle/body stretch down
                  to just above the Credits and shrink on short screens instead
                  of overlapping. Hidden over the covers (which carry no per-page
                  vocabulary). */}
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  alignSelf: 'stretch',
                  display: 'flex',
                  alignItems: 'stretch',
                  pointerEvents: 'none',
                }}
              >
                {!showCover && !showBackCover && (
                  <VocabularyPanel page={spreads[clampedIndex]} closeSignal={panelCloseSignal} />
                )}
              </div>

              {/* ── Credits panel ────────────────────────────────────────────
                  Always present; pinned to the bottom of the rail by the
                  flex:1 Dictionary slot above it. */}
              <CreditsPanel closeSignal={panelCloseSignal} />
            </div>

            {/* ── Flex row: prev | booklet | next ──────────────────────────
                Buttons are flex siblings of the card so they always sit flush
                against the booklet edges, regardless of how the card scales. */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 14,
              width: '100%', justifyContent: 'center',
            }}>

            {/* ── Prev arrow (desktop: flanks the book; mobile: moves to the
                bottom bar below) ───────────────────────────────────────── */}
            {!isMobile && (
              <NavArrow
                direction="prev"
                disabled={prevDisabled}
                hover={prevHover}
                onHoverChange={setPrevHover}
                onClick={handlePrev}
                isMobile={isMobile}
              />
            )}

            {/* ── Middle slot: closed cover | back cover | open book ──────
                While closed (cover booklet, not yet opened) the centered
                portrait BookCover stands in for the whole open-book subtree.
                While the back cover is showing, BookBackCover replaces the open
                book — PageFlip, sheet edges, and the indicator all unmount.
                Otherwise, the normal open-book subtree is rendered. */}
            {showCover && cover ? (
              <BookCover
                cover={cover}
                firstSpread={spreads[0]}
                spreadCount={spreads.length}
                coverState={coverState}
                onOpen={openCover}
                onOpenEnd={finishOpen}
                onCloseEnd={finishClose}
              />
            ) : showBackCover && backCover ? (
              <BookBackCover
                backCover={backCover}
                lastSpread={spreads[spreads.length - 1]}
                spreadCount={spreads.length}
                backCoverState={backCoverState}
                onClose={exitBackCover}
                onEnterEnd={finishEntering}
                onExitEnd={finishExiting}
              />
            ) : (
            <>
            {/* ── Book wrapper ─────────────────────────────────────────────
                Non-clipping positioned box that owns the contain-style scaling
                (flex:1 + maxWidth). The card child is the single in-flow sizing
                element, so the page-stack edges (absolute, translated fully
                outside the card) add depth without touching the canvas geometry
                or the existing scale math. */}
            <div
              onPointerDown={handleWrapperPointerDown}
              onPointerUp={handleWrapperPointerUp}
              style={{
              position: 'relative',
              flex: 1,
              maxWidth: `min(${READER_MAX_WIDTH}px, calc((100vh - 40px) * ${(CANVAS_WIDTH / CANVAS_HEIGHT).toFixed(4)}))`,
            }}>

            {/* Left page stack (pages already turned): one thin sheet per turned
                page, so it grows a sheet at a time. Full page height (top:0/
                bottom:0); rendered only when there are sheets, no transition. */}
            {leftSheets > 0 && (
              <div
                className="book-edge book-edge--left"
                style={{
                  ...sheetVar,
                  position: 'absolute',
                  left: 0,
                  transform: 'translateX(-100%)',
                  top: 0,
                  bottom: 0,
                  width: leftSheets * BOOK_SHEET_THICKNESS_PX,
                }}
              />
            )}

            {/* Right page stack (unread pages): one thin sheet per remaining
                page, shrinking a sheet at a time as the reader advances. Full
                page height; rendered only when there are sheets, no transition. */}
            {rightSheets > 0 && (
              <div
                className="book-edge book-edge--right"
                style={{
                  ...sheetVar,
                  position: 'absolute',
                  right: 0,
                  transform: 'translateX(100%)',
                  top: 0,
                  bottom: 0,
                  width: rightSheets * BOOK_SHEET_THICKNESS_PX,
                }}
              />
            )}

            {/* ── Booklet card ─────────────────────────────────────────────
                overflow:hidden clips the 3D page-flip and gives rounded
                corners. width:100% fills the sizing wrapper above. */}
            <div style={{
              position: 'relative',
              width: '100%',
              aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
              borderRadius: 1,
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.28), 0 8px 24px rgba(0,0,0,0.16)',
            }}>
              <PageFlip
                pageCount={spreads.length}
                currentIndex={clampedIndex}
                onIndexChange={setPageIndex}
                onControlsChange={handleControlsChange}
                onIsFlippingChange={setIsFlipping}
                renderPage={(index, scale) => {
                  const page = spreads[index];
                  if (!page) return null;
                  return <PageCanvas page={page} scale={scale} renderMode="reader" />;
                }}
              >
                {/* Page indicator stays inside the card at the bottom */}
                {() => (
                  <div style={{
                    position: 'absolute', bottom: 14, left: '50%',
                    transform: 'translateX(-50%)', zIndex: 25,
                    backgroundColor: 'rgba(0,0,0,0.38)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: 40, padding: '5px 14px',
                    display: 'flex', alignItems: 'center', gap: 7,
                    whiteSpace: 'nowrap',
                  }}>
                    {spreads.length <= DOT_NAV_MAX
                      ? Array.from({ length: spreads.length }).map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            aria-label={`Go to page ${i + 1}`}
                            disabled={isFlipping || i === clampedIndex}
                            onClick={() => setPageIndex(i)}
                            onMouseEnter={() => setHoveredDot(i)}
                            onMouseLeave={() => setHoveredDot(null)}
                            style={{
                              width: i === clampedIndex ? 20 : hoveredDot === i ? 14 : 8,
                              height: 8,
                              borderRadius: 6,
                              flexShrink: 0,
                              backgroundColor: i === clampedIndex
                                ? BRAND.yellow
                                : hoveredDot === i
                                ? 'rgba(255,255,255,0.72)'
                                : 'rgba(255,255,255,0.40)',
                              transition: 'all 0.25s ease',
                              border: 'none',
                              padding: 0,
                              cursor: isFlipping || i === clampedIndex ? 'default' : 'pointer',
                            }}
                          />
                        ))
                      : (
                        <div
                          title={`Page ${clampedIndex + 1} of ${spreads.length} — click to jump`}
                          style={{ height: 6, width: 100, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden', flexShrink: 0, cursor: isFlipping ? 'default' : 'pointer' }}
                          onClick={(e) => {
                            if (isFlipping) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const ratio = (e.clientX - rect.left) / rect.width;
                            setPageIndex(Math.max(0, Math.min(spreads.length - 1, Math.round(ratio * (spreads.length - 1)))));
                          }}
                        >
                          <div style={{ height: '100%', borderRadius: 6, backgroundColor: BRAND.yellow, width: `${pageProgress}%`, transition: 'width 0.3s ease-out' }} />
                        </div>
                      )
                    }
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: 'rgba(255,255,255,0.85)',
                      letterSpacing: '0.04em',
                      marginLeft: 1,
                    }}>
                      {clampedIndex + 1} / {spreads.length}
                    </span>
                  </div>
                )}
              </PageFlip>
            </div>{/* booklet card */}
            </div>{/* book wrapper */}
            </>
            )}

            {/* ── Next arrow (desktop only; mobile lives in the bottom bar) ── */}
            {!isMobile && (
              <NavArrow
                direction="next"
                disabled={nextDisabled}
                hover={nextHover}
                onHoverChange={setNextHover}
                onClick={handleNext}
                isMobile={isMobile}
              />
            )}

            </div>{/* flex row */}

            {/* ── Mobile bottom nav bar ────────────────────────────────────
                On narrow screens the left side rail (dictionary/credits
                handles) overlaps where the flanking prev arrow used to sit, so
                both arrows drop below the book and stand centered at the bottom
                of the viewer area, clear of the rail. */}
            {isMobile && (
              <div style={{
                position: 'absolute',
                left: 0, right: 0, bottom: 16,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                gap: 20,
                zIndex: 20,
                pointerEvents: 'none',
              }}>
                <div style={{ display: 'flex', gap: 20, pointerEvents: 'auto' }}>
                  <NavArrow
                    direction="prev"
                    disabled={prevDisabled}
                    hover={prevHover}
                    onHoverChange={setPrevHover}
                    onClick={handlePrev}
                    isMobile={isMobile}
                  />
                  <NavArrow
                    direction="next"
                    disabled={nextDisabled}
                    hover={nextHover}
                    onHoverChange={setNextHover}
                    onClick={handleNext}
                    isMobile={isMobile}
                  />
                </div>
              </div>
            )}

            {/* QuizEmbed lives here — outside the PageFlip/card transform and
                overflow:hidden contexts (including the back cover card's, which
                is also overflow:hidden) — so Fillout's slider can escape to the
                viewport correctly. Shown only on the settled back cover. */}
            {showQuizOnBackCover && booklet.quiz_embed_code && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 15,
                pointerEvents: 'none',
              }}>
                <div style={{ pointerEvents: 'auto' }}>
                  <QuizEmbed embedCode={booklet.quiz_embed_code} />
                </div>
              </div>
            )}
          </div>{/* viewer area */}
        </div>
      </WordSpeechProvider>
    </div>
  );
}
