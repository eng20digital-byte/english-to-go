import { useState, type ReactNode } from 'react';
import { BRAND } from '@/config/theme';
import { BTN_BASE } from './adminControls';

// The dashed empty-state card shared by the admin lists: an accent icon
// bubble + title + subtitle, and an optional action button (e.g. the
// "Clear filters" reset). `accent` switches the dashed border / icon bubble
// tint (green = "nothing here yet", pink = "filters hide everything").
type EmptyAccent = 'green' | 'pink';

const ACCENT_RGB: Record<EmptyAccent, string> = {
  green: '89,178,146',
  pink: '250,103,129',
};

interface EmptyStateProps {
  icon: ReactNode; // accent-colored lucide icon, rendered inside the bubble
  title: string;
  subtitle: string;
  accent: EmptyAccent;
  padding?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({
  icon,
  title,
  subtitle,
  accent,
  padding = '60px 24px',
  action,
}: EmptyStateProps) {
  const rgb = ACCENT_RGB[accent];
  const [actionHover, setActionHover] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding,
        backgroundColor: BRAND.cream,
        borderRadius: 24,
        border: `2px dashed rgba(${rgb},0.4)`,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: `rgba(${rgb},0.12)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: BRAND.text }}>{title}</p>
        <p style={{ margin: '5px 0 0', fontSize: 14, color: BRAND.textMuted }}>{subtitle}</p>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          onMouseEnter={() => setActionHover(true)}
          onMouseLeave={() => setActionHover(false)}
          style={{
            ...BTN_BASE,
            backgroundColor: actionHover ? BRAND.greenDark : BRAND.green,
            color: '#fff',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
