import { useEffect, useState } from 'react';
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
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.82)', fontSize: 15, maxWidth: 320, lineHeight: 1.5 }}>{message}</p>
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

  useEffect(() => {
    if (booklet) document.title = booklet.title;
  }, [booklet]);

  if (isLoading) return <LoadingState />;
  if (isError) return <ReaderError icon={<AlertTriangle size={26} color="rgba(255,193,77,0.9)" />} message="Something went wrong loading this booklet. Please try again." />;
  if (!booklet) return <ReaderError icon={<BookX size={26} color="rgba(255,255,255,0.7)" />} message="This booklet could not be found." />;
  if (booklet.pages.length === 0) return <ReaderError icon={<BookOpen size={26} color="rgba(255,255,255,0.7)" />} message="This booklet has no pages yet." />;

  const clampedIndex = Math.min(pageIndex, booklet.pages.length - 1);
  const currentPage = booklet.pages[clampedIndex];
  const pageProgress = booklet.pages.length > 1
    ? (clampedIndex / (booklet.pages.length - 1)) * 100
    : 100;

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

          {/* ── Booklet area ─────────────────────────────────────────────────
              3vw horizontal margin lets the green bg + paper shapes show at
              the edges; 20px vertical is the minimum breathing room top/bottom.
              maxHeight: 100% + aspectRatio = contain semantics, same technique
              as the editor canvas — never scrolls, always fits. */}
          <div style={{
            flex: 1, minHeight: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px 3vw',
          }}>
            {/* Booklet card — position:relative anchors all overlay controls.
                overflow:hidden clips the 3D page-flip AND gives rounded corners.
                Both this div and PageFlip's inner canvas reference READER_MAX_WIDTH
                so they are always the same size (no gap / misalignment). */}
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: READER_MAX_WIDTH,
              maxHeight: '100%',
              aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.28), 0 8px 24px rgba(0,0,0,0.16)',
            }}>
              <PageFlip
                pageCount={booklet.pages.length}
                currentIndex={clampedIndex}
                onIndexChange={setPageIndex}
                renderPage={(index, scale) => {
                  const page = booklet.pages[index];
                  if (!page) return null;
                  if (page.is_quiz_page) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {booklet.quiz_embed_code && <QuizEmbed embedCode={booklet.quiz_embed_code} />}
                        <PageCanvas page={page} scale={scale} renderMode="reader" />
                      </div>
                    );
                  }
                  return <PageCanvas page={page} scale={scale} renderMode="reader" />;
                }}
              >
                {({ next, prev, isFlipping }) => {
                  const prevDisabled = isFlipping || clampedIndex === 0;
                  const nextDisabled = isFlipping || clampedIndex === booklet.pages.length - 1;
                  return (
                    <>
                      {/* ── NW edge: collapsible speech-rate D-tab ─────────────────
                          Collapsed: cream half-circle (D-shape) flush to card's left
                          inner edge — a pure geometric shelf, paper-cut aesthetic.
                          Expanded: panel body slides out rightward from the D-cap,
                          revealing the speed slider; cap stays at the edge as the
                          fully-rounded left side of the combined shape.
                          filter:drop-shadow traces the actual shape, not the bounding
                          box, so the shadow is correct in both states. */}
                      {!currentPage?.is_quiz_page && (
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            // 24px clearance ensures the D-cap clears the booklet
                            // card's borderRadius:20 corner clip at x=0.
                            top: 24,
                            zIndex: 25,
                            display: 'flex',
                            alignItems: 'center',
                            // drop-shadow traces the combined D-cap + panel outline
                            filter: 'drop-shadow(3px 3px 14px rgba(0,0,0,0.22)) drop-shadow(1px 1px 4px rgba(0,0,0,0.12))',
                          }}
                        >
                          {/* D-cap — always visible; click to toggle panel */}
                          <button
                            type="button"
                            aria-label={speechExpanded ? 'Close speed control' : 'Open speed control'}
                            onClick={() => setSpeechExpanded((v) => !v)}
                            style={{
                              width: 32, height: 64, flexShrink: 0,
                              backgroundColor: BRAND.cream,
                              // flat left (attached to card edge) + semicircle right = D-shape
                              borderRadius: '0 32px 32px 0',
                              border: 'none', cursor: 'pointer', padding: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: speechExpanded ? BRAND.green : BRAND.textMuted,
                              transition: 'color 0.2s',
                              fontFamily: 'inherit',
                            }}
                          >
                            <Volume2 size={14} />
                          </button>

                          {/* Panel body — slides out rightward from the D-cap */}
                          <div
                            style={{
                              height: 64,
                              width: speechExpanded ? 186 : 0,
                              overflow: 'hidden',
                              backgroundColor: BRAND.cream,
                              // '0 20px 20px 0': flat left (joins D-cap seamlessly) + rounded right
                              borderRadius: '0 20px 20px 0',
                              transition: 'width 0.38s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex', alignItems: 'center',
                                height: '100%',
                                padding: '0 16px 0 6px',
                                // fade in after the panel has opened enough to show content
                                opacity: speechExpanded ? 1 : 0,
                                transition: speechExpanded
                                  ? 'opacity 0.22s ease 0.18s'
                                  : 'opacity 0.1s ease 0s',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <SpeechRateControl compact />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── W: previous page ──────────────────────────────────── */}
                      <button
                        type="button"
                        aria-label="Previous page"
                        onClick={prev}
                        disabled={prevDisabled}
                        onMouseEnter={() => setPrevHover(true)}
                        onMouseLeave={() => setPrevHover(false)}
                        style={{
                          position: 'absolute', left: 14, top: '50%',
                          transform: `translateY(-50%) scale(${!prevDisabled && prevHover ? 1.08 : 1})`,
                          zIndex: 20,
                          width: 44, height: 60, borderRadius: 14, border: 'none',
                          backgroundColor: prevDisabled
                            ? 'rgba(250,231,203,0.18)'
                            : prevHover ? 'rgba(250,231,203,0.97)' : 'rgba(250,231,203,0.85)',
                          color: prevDisabled ? 'rgba(26,26,26,0.18)' : BRAND.text,
                          cursor: prevDisabled ? 'default' : 'pointer',
                          fontSize: 28, lineHeight: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: prevDisabled ? 'none'
                            : prevHover ? '0 8px 24px rgba(0,0,0,0.22)' : '0 4px 16px rgba(0,0,0,0.14)',
                          backdropFilter: prevDisabled ? 'none' : 'blur(10px)',
                          transition: 'background-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
                          fontFamily: 'inherit',
                        }}
                      >
                        ‹
                      </button>

                      {/* ── E: next page ─────────────────────────────────────── */}
                      <button
                        type="button"
                        aria-label="Next page"
                        onClick={next}
                        disabled={nextDisabled}
                        onMouseEnter={() => setNextHover(true)}
                        onMouseLeave={() => setNextHover(false)}
                        style={{
                          position: 'absolute', right: 14, top: '50%',
                          transform: `translateY(-50%) scale(${!nextDisabled && nextHover ? 1.08 : 1})`,
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

                      {/* ── S: page position indicator + counter ─────────────── */}
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
                    </>
                  );
                }}
              </PageFlip>
            </div>
          </div>
        </div>
      </WordSpeechProvider>
    </div>
  );
}
