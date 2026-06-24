interface PageNavProps {
  currentIndex: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
  disabled: boolean;
}

const DOT_NAV_MAX = 12;

// Prev/next controls + progress indicator for the public reader. Reader
// chrome lives under #reader-root (see CLAUDE.md "UI component library —
// scope boundary"), so Tailwind utilities are safe here — this is not
// src/renderer/. LTR convention (previous = left, next = right) per the
// booklets being English-language content.
export function PageNav({ currentIndex, pageCount, onPrev, onNext, disabled }: PageNavProps) {
  const progress = pageCount > 1 ? (currentIndex / (pageCount - 1)) * 100 : 100;
  const useDots = pageCount <= DOT_NAV_MAX;

  return (
    <nav className="flex w-full flex-col items-center gap-3">
      <div className="flex items-center gap-4">
        {/* Previous — soft white */}
        <button
          type="button"
          aria-label="Previous page"
          onClick={onPrev}
          disabled={disabled || currentIndex === 0}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-light text-neutral-600 shadow-sm ring-1 ring-black/5 transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 active:scale-95 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none disabled:active:scale-100 disabled:hover:translate-y-0"
        >
          ‹
        </button>

        {/* Page counter */}
        <span className="min-w-[5.5rem] text-center text-sm font-semibold text-neutral-700 tabular-nums">
          {currentIndex + 1} / {pageCount}
        </span>

        {/* Next — coral primary */}
        <button
          type="button"
          aria-label="Next page"
          onClick={onNext}
          disabled={disabled || currentIndex === pageCount - 1}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(22_90%_62%)] text-xl font-light text-white shadow-sm transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 active:scale-95 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none disabled:active:scale-100 disabled:hover:translate-y-0"
        >
          ›
        </button>
      </div>

      {/* Dot indicators (≤12 pages) or progress bar */}
      {useDots ? (
        <div className="flex items-center gap-1.5">
          {Array.from({ length: pageCount }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? 'h-2 w-5 bg-[hsl(22_90%_62%)]'
                  : 'h-2 w-2 bg-neutral-200'
              }`}
            />
          ))}
        </div>
      ) : (
        <div className="h-2 w-44 overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[hsl(22_90%_62%/0.7)] to-[hsl(22_90%_62%)] transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </nav>
  );
}
