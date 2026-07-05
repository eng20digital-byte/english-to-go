import { useState, type CSSProperties } from 'react';
import { Check, Link2, Trash2 } from 'lucide-react';
import { BTN_BASE } from '@/admin/shell/adminControls';
import { BRAND } from '@/config/theme';

// The bulk-action bar over the recipient list (RP5). Two contextual modes:
//   • nothing selected → whole-booklet actions (Publish all · Unpublish all ·
//     Copy all links), which reach rows on every page, not just the current one.
//   • ≥1 row selected  → act on the checkbox selection (Publish · Unpublish ·
//     Delete) plus a count + clear.
// A leading "select all on this page" checkbox is always present. Kept visual-only
// here; all persistence lives in the page's mutations.
interface RecipientBulkBarProps {
  selectedCount: number;
  allOnPageSelected: boolean;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onPublishSelected: () => void;
  onUnpublishSelected: () => void;
  onDeleteSelected: () => void;
  onPublishAll: () => void;
  onUnpublishAll: () => void;
  onCopyAllLinks: () => void;
  copied: boolean;
  isBusy: boolean;
}

export function RecipientBulkBar({
  selectedCount,
  allOnPageSelected,
  onToggleSelectAll,
  onClearSelection,
  onPublishSelected,
  onUnpublishSelected,
  onDeleteSelected,
  onPublishAll,
  onUnpublishAll,
  onCopyAllLinks,
  copied,
  isBusy,
}: RecipientBulkBarProps) {
  const [hover, setHover] = useState<string | null>(null);
  const hasSelection = selectedCount > 0;

  const btn = (
    key: string,
    variant: 'neutral' | 'green' | 'danger',
    extra?: CSSProperties,
  ): CSSProperties => {
    const palette = {
      neutral: {
        bg: hover === key ? 'rgba(0,0,0,0.13)' : 'rgba(0,0,0,0.07)',
        color: BRAND.text,
      },
      green: { bg: hover === key ? BRAND.greenDark : BRAND.green, color: '#fff' },
      danger: {
        bg: hover === key ? 'rgba(250,103,129,0.2)' : 'rgba(250,103,129,0.12)',
        color: BRAND.pink,
      },
    }[variant];
    return {
      ...BTN_BASE,
      padding: '8px 14px',
      fontSize: 13,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      backgroundColor: palette.bg,
      color: palette.color,
      opacity: isBusy ? 0.6 : 1,
      cursor: isBusy ? 'not-allowed' : 'pointer',
      ...extra,
    };
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        backgroundColor: BRAND.cream,
        borderRadius: 14,
        padding: '12px 16px',
        marginBottom: 16,
        boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
      }}
    >
      {/* Select all on the current page */}
      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          fontWeight: 700,
          color: BRAND.text,
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={allOnPageSelected}
          onChange={onToggleSelectAll}
          aria-label="Select all users on this page"
          style={{ width: 17, height: 17, accentColor: BRAND.green, cursor: 'pointer' }}
        />
        {hasSelection ? `${selectedCount} selected` : 'Select all'}
      </label>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
        {hasSelection ? (
          <>
            <button
              type="button"
              disabled={isBusy}
              onClick={onPublishSelected}
              onMouseEnter={() => setHover('pubSel')}
              onMouseLeave={() => setHover(null)}
              style={btn('pubSel', 'green')}
            >
              Publish
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={onUnpublishSelected}
              onMouseEnter={() => setHover('unpubSel')}
              onMouseLeave={() => setHover(null)}
              style={btn('unpubSel', 'neutral')}
            >
              Unpublish
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={onDeleteSelected}
              onMouseEnter={() => setHover('delSel')}
              onMouseLeave={() => setHover(null)}
              style={btn('delSel', 'danger')}
            >
              <Trash2 size={13} />
              Delete
            </button>
            <button
              type="button"
              onClick={onClearSelection}
              onMouseEnter={() => setHover('clear')}
              onMouseLeave={() => setHover(null)}
              style={btn('clear', 'neutral')}
            >
              Clear
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={isBusy}
              onClick={onPublishAll}
              onMouseEnter={() => setHover('pubAll')}
              onMouseLeave={() => setHover(null)}
              style={btn('pubAll', 'green')}
            >
              Publish all
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={onUnpublishAll}
              onMouseEnter={() => setHover('unpubAll')}
              onMouseLeave={() => setHover(null)}
              style={btn('unpubAll', 'neutral')}
            >
              Unpublish all
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={onCopyAllLinks}
              onMouseEnter={() => setHover('copyAll')}
              onMouseLeave={() => setHover(null)}
              style={btn(
                'copyAll',
                'neutral',
                copied ? { backgroundColor: 'rgba(89,178,146,0.18)', color: BRAND.green } : undefined,
              )}
            >
              {copied ? <Check size={13} /> : <Link2 size={13} />}
              {copied ? 'Copied all' : 'Copy all links'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
