import { BRAND } from '@/config/theme';

interface PageNavProps {
  currentIndex: number;
  pageCount: number;
  // onPrev/onNext/disabled kept for interface compatibility — navigation is now
  // handled by overlay buttons in ReaderBookletPage; PageNav renders only the
  // dot / progress position indicator shown in the top control bar.
  onPrev: () => void;
  onNext: () => void;
  disabled: boolean;
}

const DOT_NAV_MAX = 12;

// Page position indicator for the reader top control bar.
// Prev/next buttons have moved to side overlays on the canvas itself;
// this component shows where the reader is in the booklet (dots ≤12 pages,
// progress bar for longer booklets). Reader chrome lives under #reader-root
// — see CLAUDE.md "UI component library — scope boundary".
export function PageNav({ currentIndex, pageCount }: PageNavProps) {
  const progress = pageCount > 1 ? (currentIndex / (pageCount - 1)) * 100 : 100;
  const useDots = pageCount <= DOT_NAV_MAX;

  if (useDots) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {Array.from({ length: pageCount }).map((_, i) => (
          <div
            key={i}
            style={{
              borderRadius: 6,
              transition: 'all 0.3s ease',
              width: i === currentIndex ? 22 : 8,
              height: 8,
              backgroundColor: i === currentIndex
                ? BRAND.green
                : 'rgba(26,26,26,0.2)',
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{
      height: 7, width: 140, borderRadius: 7,
      backgroundColor: 'rgba(26,26,26,0.12)',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      <div
        style={{
          height: '100%',
          borderRadius: 7,
          backgroundColor: BRAND.green,
          width: `${progress}%`,
          transition: 'width 0.3s ease-out',
        }}
      />
    </div>
  );
}
