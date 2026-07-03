import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BRAND } from '@/config/theme';

// The floating cream header card shared by the library-style pages (Booklets,
// Fonts, Media): a back-to-dashboard pill + title + subtitle + icon badge.
// `accent` swaps the pill/badge color (green for Fonts/Media, pink for
// Booklets) — the only real per-page difference.
type HeaderAccent = 'green' | 'pink';

const ACCENTS: Record<HeaderAccent, { color: string; rgb: string; backMarginBottom: number }> = {
  green: { color: BRAND.green, rgb: '89,178,146', backMarginBottom: 20 },
  pink: { color: BRAND.pink, rgb: '250,103,129', backMarginBottom: 18 },
};

interface AdminPageHeaderProps {
  title: string;
  subtitle: string;
  icon: ReactNode; // white lucide icon, rendered inside the badge
  accent: HeaderAccent;
  backTo?: string;
  backLabel?: string;
}

export function AdminPageHeader({
  title,
  subtitle,
  icon,
  accent,
  backTo = '/admin',
  backLabel = 'Back to Dashboard',
}: AdminPageHeaderProps) {
  const a = ACCENTS[accent];
  const [backHover, setBackHover] = useState(false);

  return (
    <header
      style={{
        backgroundColor: BRAND.cream,
        borderRadius: 20,
        padding: '24px 32px 28px',
        marginBottom: 28,
        boxShadow: '0 8px 28px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)',
      }}
    >
      <Link
        to={backTo}
        onMouseEnter={() => setBackHover(true)}
        onMouseLeave={() => setBackHover(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '7px 14px 7px 10px',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 700,
          color: backHover ? BRAND.text : a.color,
          backgroundColor: backHover ? `rgba(${a.rgb},0.14)` : `rgba(${a.rgb},0.08)`,
          border: `1.5px solid ${backHover ? `rgba(${a.rgb},0.4)` : `rgba(${a.rgb},0.2)`}`,
          textDecoration: 'none',
          marginBottom: a.backMarginBottom,
          transition: 'all 0.15s',
        }}
      >
        <ArrowLeft size={14} />
        {backLabel}
      </Link>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              color: BRAND.text,
              letterSpacing: '-0.4px',
              fontFamily: 'inherit',
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: '7px 0 0',
              fontSize: 14,
              color: BRAND.textMuted,
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>
        </div>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: a.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginLeft: 20,
            boxShadow: '4px 4px 0 rgba(0,0,0,0.1)',
          }}
        >
          {icon}
        </div>
      </div>
    </header>
  );
}
