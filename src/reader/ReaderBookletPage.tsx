import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, BookOpen, BookX, Volume2 } from 'lucide-react';
import { useBookletByToken } from '@/hooks/useBookletQuery';
import { PageCanvas } from '@/renderer/PageCanvas';
import { WordSpeechProvider } from '@/tts/useWordSpeech';
import { SpeechRateControl } from '@/tts/SpeechRateControl';
import { QuizEmbed } from '@/quiz/QuizEmbed';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/canvas';
import { READER_MAX_WIDTH } from '@/config/reader';
import { PageFlip } from './PageFlip';
import { VocabularyPanel } from './VocabularyPanel';
import { BRAND } from '@/config/theme';

// Dots for ≤12 pages; progress bar for longer booklets.
const DOT_NAV_MAX = 12;

// Decorative paper-cut background shapes — same visual language as admin pages.
function BgShapes() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', top: -160, right: -120, backgroundColor: BRAND.yellow, opacity: 0.22, boxShadow: '8px 10px 0 rgba(0,0,0,0.05)' }} />
      <div style={{ position: 'absolute', width: 400, height: 200, borderRadius: 110, bottom: -80, left: -100, backgroundColor: BRAND.cream, opacity: 0.2, boxShadow: '6px 8px 0 rgba(0,0,0,0.05)' }} />
      <div style={{ position: 'absolute', width: 260, height: 260, borderRadius: '50%', top: '38%', left: -90, backgroundColor: BRAND.pink, opacity: 0.14, boxShadow: '6px 8px 0 rgba(0,0,0,0.06)' }} />
      <div style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', bottom: -80, right: -60, backgroundColor: '#3d9b7a', opacity: 0.18 }} />
      <div style={{ position: 'absolute', width: 140, height: 240, borderRadius: 46, top: 40, left: '25%', backgroundColor: BRAND.cream, opacity: 0.07 }} />
    </div>
  );
}

function LoadingState() {
  return (
    <div id="reader-root" style={{
      position: 'fixed', inset: 0,
      backgroundColor: BRAND.green, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
    }}>
      <BgShapes />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 420, height: 236, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', animation: 'sk-pulse 1.5s ease-in-out infinite', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ width: i === 0 ? 20 : 8, height: 8, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)', animation: 'sk-pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ReaderError({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div id="reader-root" style={{
      position: 'fixed', inset: 0,
      backgroundColor: BRAND.green, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
    }}>
      <BgShapes />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', padding: '0 24px' }}>
        <div style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.82)', fontSize: 15, maxWidth: 225, lineHeight: 1.5 }}>{message}</p>
      </div>
    </div>
  );
}

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
  const [pageIndex, setPageIndex] = useState(0);
  const [prevHover, setPrevHover] = useState(false);
  const [nextHover, setNextHover] = useState(false);
  const [speechExpanded, setSpeechExpanded] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const flipControlsRef = useRef<{ next: () => void; prev: () => void } | null>(null);
  const handleControlsChange = useCallback(
    (controls: { next: () => void; prev: () => void }) => { flipControlsRef.current = controls; },
    [],
  );

  useEffect(() => {
    if (booklet) document.title = booklet.title;
  }, [booklet]);

  if (isLoading) return <LoadingState />;
  if (isError) return <ReaderError icon={<AlertTriangle size={26} color="rgba(255,193,77,0.9)" />} message="Something went wrong loading this booklet. Please try again." />;
  if (!booklet) return <ReaderError icon={<BookX size={26} color="rgba(255,255,255,0.7)" />} message="This booklet could not be found. It may not be published or disabled" />;
  if (booklet.pages.length === 0) return <ReaderError icon={<BookOpen size={26} color="rgba(255,255,255,0.7)" />} message="This booklet has no pages yet." />;

  const clampedIndex = Math.min(pageIndex, booklet.pages.length - 1);
  const pageProgress = booklet.pages.length > 1
    ? (clampedIndex / (booklet.pages.length - 1)) * 100
    : 100;

  const prevDisabled = isFlipping || clampedIndex === 0;
  const nextDisabled = isFlipping || clampedIndex === booklet.pages.length - 1;

  return (
    <div
      id="reader-root"
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: BRAND.green,
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
      }}
    >
      <BgShapes />

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
            padding: '20px 16px',
          }}>

            {/* ── Upper-left: sliding speech-rate panel ────────────────────
                Collapsed: only the rightmost 60px (speaker button) is visible.
                Expanded: the full panel slides into view (translateX(0)).
                left:0 so the panel emerges from the viewer's left edge. */}
            <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 16,
                  transform: `translateX(${speechExpanded ? '0px' : '-180px'})`,
                  transition: 'transform 0.38s cubic-bezier(0.4, 0, 0.2, 1)',
                  width: 240,
                  height: 56,
                  backgroundColor: BRAND.cream,
                  borderRadius: 16,
                  boxShadow: '2px 4px 18px rgba(0,0,0,0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  zIndex: 25,
                  overflow: 'hidden',
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

            {/* ── Left edge: collapsible page-aware vocabulary panel ───────
                Vertically centered, below the top-anchored speech tab so the
                two peeking tabs don't overlap. Shows only the current page's
                vocabulary and re-renders as clampedIndex changes on flip. */}
            <VocabularyPanel page={booklet.pages[clampedIndex]} />

            {/* ── Flex row: prev | booklet | next ──────────────────────────
                Buttons are flex siblings of the card so they always sit flush
                against the booklet edges, regardless of how the card scales. */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              width: '100%', justifyContent: 'center',
            }}>

            {/* ── Prev arrow ───────────────────────────────────────────── */}
            <button
              type="button"
              aria-label="Previous page"
              onClick={() => flipControlsRef.current?.prev()}
              disabled={prevDisabled}
              onMouseEnter={() => setPrevHover(true)}
              onMouseLeave={() => setPrevHover(false)}
              style={{
                flexShrink: 0,
                transform: `scale(${!prevDisabled && prevHover ? 1.08 : 1})`,
                zIndex: 20,
                width: 44, height: 60, borderRadius: 14, border: 'none',
                backgroundColor: prevDisabled
                  ? 'rgba(250,103,129,0.18)'
                  : prevHover ? BRAND.pink : 'rgba(250,103,129,0.82)',
                color: prevDisabled ? 'rgba(26,26,26,0.22)' : '#fff',
                cursor: prevDisabled ? 'default' : 'pointer',
                fontSize: 28, lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: prevDisabled ? 'none'
                  : prevHover ? '0 8px 24px rgba(250,103,129,0.5)' : '0 4px 16px rgba(250,103,129,0.32)',
                backdropFilter: prevDisabled ? 'none' : 'blur(10px)',
                transition: 'background-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
                fontFamily: 'inherit',
              }}
            >
              ‹
            </button>

            {/* ── Booklet card ─────────────────────────────────────────────
                overflow:hidden clips the 3D page-flip and gives rounded
                corners. flex:1 + maxWidth gives contain-style scaling. */}
            <div style={{
              position: 'relative',
              flex: 1,
              maxWidth: `min(${READER_MAX_WIDTH}px, calc((100vh - 40px) * ${(CANVAS_WIDTH / CANVAS_HEIGHT).toFixed(4)}))`,
              aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.28), 0 8px 24px rgba(0,0,0,0.16)',
            }}>
              <PageFlip
                pageCount={booklet.pages.length}
                currentIndex={clampedIndex}
                onIndexChange={setPageIndex}
                onControlsChange={handleControlsChange}
                onIsFlippingChange={setIsFlipping}
                renderPage={(index, scale) => {
                  const page = booklet.pages[index];
                  if (!page) return null;
                  if (page.is_quiz_page) {
                    return (
                      <>
                        <PageCanvas page={page} scale={scale} renderMode="reader" />
                        {booklet.quiz_embed_code && (
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'flex-start',
                            paddingTop: '5%',
                            zIndex: 10,
                          }}>
                            <QuizEmbed embedCode={booklet.quiz_embed_code} />
                          </div>
                        )}
                      </>
                    );
                  }
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
                    {booklet.pages.length <= DOT_NAV_MAX
                      ? Array.from({ length: booklet.pages.length }).map((_, i) => (
                          <div
                            key={i}
                            style={{
                              width: i === clampedIndex ? 20 : 8, height: 8,
                              borderRadius: 6, flexShrink: 0,
                              backgroundColor: i === clampedIndex
                                ? BRAND.yellow
                                : 'rgba(255,255,255,0.40)',
                              transition: 'all 0.3s ease',
                            }}
                          />
                        ))
                      : (
                        <div style={{ height: 6, width: 100, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
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
                      {clampedIndex + 1} / {booklet.pages.length}
                    </span>
                  </div>
                )}
              </PageFlip>
            </div>{/* booklet card */}

            {/* ── Next arrow ───────────────────────────────────────────── */}
            <button
              type="button"
              aria-label="Next page"
              onClick={() => flipControlsRef.current?.next()}
              disabled={nextDisabled}
              onMouseEnter={() => setNextHover(true)}
              onMouseLeave={() => setNextHover(false)}
              style={{
                flexShrink: 0,
                transform: `scale(${!nextDisabled && nextHover ? 1.08 : 1})`,
                zIndex: 20,
                width: 44, height: 60, borderRadius: 14, border: 'none',
                backgroundColor: nextDisabled
                  ? 'rgba(255,201,77,0.18)'
                  : nextHover ? BRAND.yellow : 'rgba(255,201,77,0.88)',
                color: nextDisabled ? 'rgba(26,26,26,0.18)' : BRAND.text,
                cursor: nextDisabled ? 'default' : 'pointer',
                fontSize: 28, lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: nextDisabled ? 'none'
                  : nextHover ? '0 8px 24px rgba(255,201,77,0.5)' : '0 4px 16px rgba(255,201,77,0.35)',
                backdropFilter: nextDisabled ? 'none' : 'blur(10px)',
                transition: 'background-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
                fontFamily: 'inherit',
              }}
            >
              ›
            </button>

            </div>{/* flex row */}
          </div>{/* viewer area */}
        </div>
      </WordSpeechProvider>
    </div>
  );
}
