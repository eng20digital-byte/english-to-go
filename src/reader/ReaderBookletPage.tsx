import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, BookOpen, BookX } from 'lucide-react';
import { useBookletByToken } from '@/hooks/useBookletQuery';
import { PageCanvas } from '@/renderer/PageCanvas';
import { WordSpeechProvider } from '@/tts/useWordSpeech';
import { SpeechRateControl } from '@/tts/SpeechRateControl';
import { QuizEmbed } from '@/quiz/QuizEmbed';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/canvas';
import { PageFlip } from './PageFlip';
import { PageNav } from './PageNav';

// Warm cream → peach → lavender gradient used on every reader background.
const READER_BG =
  'bg-gradient-to-b from-[hsl(38_55%_95%)] via-[hsl(22_60%_92%)] to-[hsl(260_40%_92%)]';

// Booklet-shaped skeleton shown while data is fetching — mirrors the actual
// rendered layout so the page feels stable rather than jumping on load.
// Lives under #reader-root (see CLAUDE.md "UI component library — scope
// boundary"), so Tailwind utilities are safe here.
function LoadingState() {
  return (
    <div
      id="reader-root"
      className={`flex min-h-screen flex-col items-center justify-center gap-6 ${READER_BG} p-4 py-10 sm:p-8`}
    >
      {/* Speech rate control placeholder — warm beige tint */}
      <div className="h-10 w-56 animate-pulse rounded-full bg-white/60" />

      {/* Booklet card skeleton — matches the real card's shape exactly */}
      <div className="w-full max-w-[640px] overflow-hidden rounded-[2rem] bg-white/95 shadow-[var(--shadow-float)] ring-1 ring-white/80">
        {/* Canvas area — 1080/1920 aspect ratio */}
        <div
          style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
          className="relative bg-[hsl(38_30%_94%)]"
        >
          <div className="absolute inset-0 animate-pulse">
            <div className="absolute left-8 right-8 top-12 h-7 rounded-xl bg-[hsl(38_30%_87%)/80]" />
            <div className="absolute left-14 right-14 top-24 h-5 rounded-xl bg-[hsl(38_30%_87%)/70]" />
            <div className="absolute left-10 right-10 top-36 h-5 rounded-xl bg-[hsl(38_30%_87%)/60]" />
            <div className="absolute bottom-52 left-10 right-10 h-5 rounded-xl bg-[hsl(38_30%_87%)/70]" />
            <div className="absolute bottom-40 left-16 right-16 h-5 rounded-xl bg-[hsl(38_30%_87%)/60]" />
          </div>
        </div>

        {/* Nav area */}
        <div className="flex justify-center border-t border-[hsl(35_20%_90%)] bg-white px-4 py-4">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 animate-pulse rounded-2xl bg-[hsl(38_30%_93%)]" />
              <div className="h-4 w-20 animate-pulse rounded-full bg-[hsl(38_30%_88%)]" />
              <div className="h-12 w-12 animate-pulse rounded-2xl bg-[hsl(22_90%_62%)/20]" />
            </div>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-2 w-2 animate-pulse rounded-full bg-[hsl(38_30%_88%)]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ReaderErrorProps {
  icon: React.ReactNode;
  message: string;
}

function ReaderError({ icon, message }: ReaderErrorProps) {
  return (
    <div
      id="reader-root"
      className={`flex min-h-screen flex-col items-center justify-center gap-4 ${READER_BG} p-6 text-center`}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white"
        style={{ boxShadow: 'var(--shadow-raised)' }}
      >
        {icon}
      </div>
      <p className="max-w-xs text-base text-neutral-500">{message}</p>
    </div>
  );
}

// Public reader: no auth, no admin/editor chrome — everything here lives
// under #reader-root, the reader's own Tailwind-chrome scope (mirrors
// #admin-root, see CLAUDE.md "UI component library — scope boundary").
// `src/renderer/` (PageCanvas + element renderers) is untouched and never
// receives Tailwind classes — only the chrome around it does. Renders the
// same `PageCanvas` the editor uses (renderMode="reader"), so visual output
// is guaranteed to match what was built in the admin app.
//
// RLS already restricts anonymous reads to published booklets, so an unknown
// token and a draft/disabled one both resolve to `booklet === null` here —
// rendered as one generic not-found message, never distinguishing the two
// (see useBookletQuery's comment and M5 manual verification steps 3-4).
export function ReaderBookletPage() {
  const { token } = useParams<{ token: string }>();
  const { data: booklet, isLoading, isError } = useBookletByToken(token);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    if (booklet) document.title = booklet.title;
  }, [booklet]);

  if (isLoading) return <LoadingState />;

  if (isError) {
    return (
      <ReaderError
        icon={<AlertTriangle className="h-7 w-7 text-amber-400" />}
        message="Something went wrong loading this booklet. Please try again."
      />
    );
  }

  if (!booklet) {
    return (
      <ReaderError
        icon={<BookX className="h-7 w-7 text-neutral-400" />}
        message="This booklet could not be found."
      />
    );
  }

  if (booklet.pages.length === 0) {
    return (
      <ReaderError
        icon={<BookOpen className="h-7 w-7 text-neutral-400" />}
        message="This booklet has no pages yet."
      />
    );
  }

  const clampedIndex = Math.min(pageIndex, booklet.pages.length - 1);
  const currentPage = booklet.pages[clampedIndex];

  return (
    <div
      id="reader-root"
      className={`flex min-h-screen flex-col items-center justify-center gap-6 ${READER_BG} p-4 py-10 sm:p-8`}
    >
      <WordSpeechProvider>
        {/* No speakable text on the quiz page, so the rate control would just
            be dead chrome — see CLAUDE.md "Quiz embed (final page)". */}
        {!currentPage?.is_quiz_page && <SpeechRateControl />}

        {/* Premium booklet card */}
        <div
          className="w-full max-w-[640px] overflow-hidden rounded-[2rem] bg-white/95 ring-1 ring-white/80"
          style={{ boxShadow: 'var(--shadow-float)' }}
        >
          <PageFlip
            pageCount={booklet.pages.length}
            currentIndex={clampedIndex}
            onIndexChange={setPageIndex}
            renderPage={(index, scale) => {
              const page = booklet.pages[index];
              if (!page) return null;
              if (page.is_quiz_page) {
                return (
                  <div className="flex flex-col">
                    {booklet.quiz_embed_code && (
                      <QuizEmbed embedCode={booklet.quiz_embed_code} />
                    )}
                    <PageCanvas page={page} scale={scale} renderMode="reader" />
                  </div>
                );
              }
              return <PageCanvas page={page} scale={scale} renderMode="reader" />;
            }}
          >
            {({ next, prev, isFlipping }) => (
              <div className="flex justify-center border-t border-[hsl(35_20%_90%)] bg-white px-4 py-4">
                <PageNav
                  currentIndex={clampedIndex}
                  pageCount={booklet.pages.length}
                  onPrev={prev}
                  onNext={next}
                  disabled={isFlipping}
                />
              </div>
            )}
          </PageFlip>
        </div>

        {/* Subtle booklet title below card */}
        <p className="text-xs font-medium tracking-wide text-neutral-400/80">{booklet.title}</p>
      </WordSpeechProvider>
    </div>
  );
}
