import { useState, type CSSProperties } from 'react';
import { ArrowUpDown, ChevronDown, Search, X } from 'lucide-react';
import {
  BOOKLET_SORT_OPTIONS,
  BOOKLET_STATUS_FILTERS,
  type BookletSortValue,
  type BookletStatusFilter,
} from '@/config/booklets';
import { BRAND } from '@/config/theme';

interface BookletLibraryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: BookletStatusFilter;
  onStatusFilterChange: (value: BookletStatusFilter) => void;
  sort: BookletSortValue;
  onSortChange: (value: BookletSortValue) => void;
  counts: Record<BookletStatusFilter, number>;
}

// Active-pill color per status, mirroring the StatusBadge color language so the
// filter chips read with the same semantics as the badges on each card:
// 'all' = neutral dark, published = green, draft = amber, disabled = pink.
const FILTER_ACTIVE_BG: Record<BookletStatusFilter, string> = {
  all: BRAND.text,
  published: BRAND.green,
  draft: '#c69200',
  disabled: BRAND.pink,
};

// Shared well style for the search input and sort select — same surface,
// radius, and focus ring as the title input on this page.
function wellStyle(focused: boolean): CSSProperties {
  return {
    backgroundColor: BRAND.creamLight,
    border: `2px solid ${focused ? BRAND.green : 'transparent'}`,
    borderRadius: 12,
    fontSize: 14,
    outline: 'none',
    boxShadow: focused ? '0 0 0 4px rgba(89,178,146,0.18)' : 'none',
    transition: 'border-color 0.18s, box-shadow 0.18s',
    color: BRAND.text,
    fontFamily: 'inherit',
  };
}

export function BookletLibraryToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sort,
  onSortChange,
  counts,
}: BookletLibraryToolbarProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [sortFocused, setSortFocused] = useState(false);
  const [hoveredFilter, setHoveredFilter] = useState<BookletStatusFilter | null>(null);
  const [clearHover, setClearHover] = useState(false);

  return (
    <div
      style={{
        backgroundColor: BRAND.cream,
        borderRadius: 24,
        padding: '22px 24px',
        marginBottom: 24,
        boxShadow: '0 8px 28px rgba(0,0,0,0.13), 0 2px 6px rgba(0,0,0,0.08)',
      }}
    >
      {/* Row 1: search field + sort select */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: BRAND.textMuted,
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search by title or link…"
            aria-label="Search booklets"
            style={{
              ...wellStyle(searchFocused),
              width: '100%',
              padding: '11px 40px 11px 40px',
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              onMouseEnter={() => setClearHover(true)}
              onMouseLeave={() => setClearHover(false)}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 26,
                height: 26,
                borderRadius: 8,
                border: 'none',
                backgroundColor: clearHover ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)',
                color: BRAND.textMuted,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.15s',
                padding: 0,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort — styled native select (keyboard-accessible for free) */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <ArrowUpDown
            size={15}
            style={{
              position: 'absolute',
              left: 13,
              top: '50%',
              transform: 'translateY(-50%)',
              color: BRAND.textMuted,
              pointerEvents: 'none',
            }}
          />
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as BookletSortValue)}
            onFocus={() => setSortFocused(true)}
            onBlur={() => setSortFocused(false)}
            aria-label="Sort booklets"
            style={{
              ...wellStyle(sortFocused),
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              padding: '11px 38px 11px 36px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {BOOKLET_SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: BRAND.textMuted,
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      {/* Row 2: status filter pills with live counts */}
      <div
        role="group"
        aria-label="Filter by status"
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}
      >
        {BOOKLET_STATUS_FILTERS.map((opt) => {
          const active = statusFilter === opt.value;
          const hovered = hoveredFilter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onStatusFilterChange(opt.value)}
              onMouseEnter={() => setHoveredFilter(opt.value)}
              onMouseLeave={() => setHoveredFilter(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '7px 14px',
                borderRadius: 11,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background-color 0.15s, color 0.15s, border-color 0.15s',
                border: `1.5px solid ${active ? 'transparent' : 'rgba(0,0,0,0.08)'}`,
                backgroundColor: active
                  ? FILTER_ACTIVE_BG[opt.value]
                  : hovered
                    ? 'rgba(0,0,0,0.06)'
                    : 'transparent',
                color: active ? '#fff' : BRAND.text,
              }}
            >
              {opt.label}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 20,
                  height: 18,
                  padding: '0 6px',
                  borderRadius: 9,
                  fontSize: 11,
                  fontWeight: 800,
                  backgroundColor: active ? 'rgba(255,255,255,0.24)' : 'rgba(0,0,0,0.07)',
                  color: active ? '#fff' : BRAND.textMuted,
                }}
              >
                {counts[opt.value]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
