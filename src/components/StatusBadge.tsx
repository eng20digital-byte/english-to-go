import type { BookletStatus } from '@/types/database';
import { BRAND } from '@/config/theme';

// Distinguishes draft/published/disabled at a glance — `disabled` must read
// as visually distinct from `draft` even though both are publicly invisible
// (see CLAUDE.md "No draft/live content fork": draft = never been live,
// disabled = was live, intentionally revoked).
//
// White pill with a colored dot: legible on any card background color
// (cream, yellow, or pink) without needing to know which card it sits on.
const STATUS_CONFIG: Record<BookletStatus, { label: string; dot: string; text: string }> = {
  draft:     { label: 'Draft',     dot: '#c69200',    text: '#7a5a00' },
  published: { label: 'Published', dot: BRAND.green,  text: '#1e6647' },
  disabled:  { label: 'Disabled',  dot: BRAND.pink,   text: '#a82040' },
};

export function StatusBadge({ status }: { status: BookletStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.2px',
      backgroundColor: 'rgba(255,255,255,0.93)',
      color: config.text,
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: config.dot,
        flexShrink: 0,
      }} />
      {config.label}
    </span>
  );
}
