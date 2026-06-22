import type { CSSProperties } from 'react';

interface PageNavProps {
  currentIndex: number;
  pageCount: number;
  onChange: (index: number) => void;
}

const navButtonStyle: CSSProperties = {
  width: 40,
  height: 40,
  fontSize: 20,
  lineHeight: 1,
  borderRadius: '50%',
  border: '1px solid #ccc',
  background: '#fff',
  cursor: 'pointer',
};

// Prev/next controls + page indicator for the public reader. No
// Tailwind/admin chrome here — see CLAUDE.md "UI component library — scope
// boundary" (Tailwind/shadcn is scoped to #admin-root).
export function PageNav({ currentIndex, pageCount, onChange }: PageNavProps) {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <button
        type="button"
        aria-label="Previous page"
        onClick={() => onChange(currentIndex - 1)}
        disabled={currentIndex === 0}
        style={{ ...navButtonStyle, opacity: currentIndex === 0 ? 0.4 : 1 }}
      >
        ‹
      </button>
      <span>
        {currentIndex + 1} / {pageCount}
      </span>
      <button
        type="button"
        aria-label="Next page"
        onClick={() => onChange(currentIndex + 1)}
        disabled={currentIndex === pageCount - 1}
        style={{ ...navButtonStyle, opacity: currentIndex === pageCount - 1 ? 0.4 : 1 }}
      >
        ›
      </button>
    </nav>
  );
}
