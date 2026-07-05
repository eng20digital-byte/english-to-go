import { useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BTN_BASE } from '@/admin/shell/adminControls';
import { RECIPIENTS_PAGE_SIZE } from '@/config/recipients';
import { BRAND } from '@/config/theme';

// Prev/next pager for the server-paginated recipient list (RP5). Shows the current
// row range out of the total match count; hides itself when everything fits on one
// page. `page` is 0-based, matching the query param.
interface RecipientPagerProps {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function RecipientPager({ page, total, onPageChange }: RecipientPagerProps) {
  const [hover, setHover] = useState<string | null>(null);

  const pageCount = Math.ceil(total / RECIPIENTS_PAGE_SIZE);
  if (pageCount <= 1) return null;

  const from = page * RECIPIENTS_PAGE_SIZE + 1;
  const to = Math.min(from + RECIPIENTS_PAGE_SIZE - 1, total);
  const atStart = page <= 0;
  const atEnd = page >= pageCount - 1;

  const navBtn = (key: string, disabled: boolean): CSSProperties => ({
    ...BTN_BASE,
    padding: '8px 12px',
    fontSize: 13,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: disabled ? 'rgba(0,0,0,0.04)' : hover === key ? 'rgba(0,0,0,0.13)' : 'rgba(0,0,0,0.07)',
    color: BRAND.text,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        marginTop: 18,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: BRAND.textMuted }}>
        {from}–{to} of {total}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          disabled={atStart}
          onClick={() => onPageChange(page - 1)}
          onMouseEnter={() => setHover('prev')}
          onMouseLeave={() => setHover(null)}
          style={navBtn('prev', atStart)}
        >
          <ChevronLeft size={15} />
          Prev
        </button>
        <button
          type="button"
          disabled={atEnd}
          onClick={() => onPageChange(page + 1)}
          onMouseEnter={() => setHover('next')}
          onMouseLeave={() => setHover(null)}
          style={navBtn('next', atEnd)}
        >
          Next
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
