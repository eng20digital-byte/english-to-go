interface PageNavProps {
  currentIndex: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
  disabled: boolean;
}

// Prev/next controls + progress indicator for the public reader. Reader
// chrome lives under #reader-root (see CLAUDE.md "UI component library —
// scope boundary"), so Tailwind utilities are safe here — this is not
// src/renderer/. LTR convention (previous = left, next = right) per the
// booklets being English-language content.
export function PageNav({ currentIndex, pageCount, onPrev, onNext, disabled }: PageNavProps) {
  const progress = pageCount > 1 ? (currentIndex / (pageCount - 1)) * 100 : 100;

  return (
    <nav className="flex w-full max-w-[640px] flex-col items-center gap-3">
      <div className="flex items-center gap-5">
        <button
          type="button"
          aria-label="Previous page"
          onClick={onPrev}
          disabled={disabled || currentIndex === 0}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl text-neutral-700 shadow-md transition hover:bg-neutral-50 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none disabled:active:scale-100"
        >
          ‹
        </button>
        <span className="min-w-[5rem] text-center text-sm font-medium text-neutral-600">
          Page {currentIndex + 1} of {pageCount}
        </span>
        <button
          type="button"
          aria-label="Next page"
          onClick={onNext}
          disabled={disabled || currentIndex === pageCount - 1}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl text-neutral-700 shadow-md transition hover:bg-neutral-50 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none disabled:active:scale-100"
        >
          ›
        </button>
      </div>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-neutral-500 transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </nav>
  );
}
