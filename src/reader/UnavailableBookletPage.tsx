// Shown when a booklet token resolves to a draft or disabled booklet.
// Gives visitors a branded, intentional "unavailable" screen rather than a
// generic not-found state, while keeping the same visual language as the
// rest of the reader (BRAND palette, BgShapes, inline styles only).
import { BookOpen } from 'lucide-react';
import { BRAND } from '@/config/theme';

export type UnavailableReason = 'draft' | 'disabled';

function BgShapes() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', top: -160, right: -120, backgroundColor: BRAND.yellow, opacity: 0.22, boxShadow: '8px 10px 0 rgba(0,0,0,0.05)' }} />
      <div style={{ position: 'absolute', width: 400, height: 200, borderRadius: 110, bottom: -80, left: -100, backgroundColor: BRAND.cream, opacity: 0.2, boxShadow: '6px 8px 0 rgba(0,0,0,0.05)' }} />
      <div style={{ position: 'absolute', width: 260, height: 260, borderRadius: '50%', top: '38%', left: -90, backgroundColor: BRAND.pink, opacity: 0.14, boxShadow: '6px 8px 0 rgba(0,0,0,0.06)' }} />
      <div style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', bottom: -80, right: -60, backgroundColor: '#3d9b7a', opacity: 0.18 }} />
      <div style={{ position: 'absolute', width: 140, height: 240, borderRadius: 46, top: 40, left: '25%', backgroundColor: BRAND.cream, opacity: 0.07 }} />
    </div>
  );
}

const BADGE: Record<UnavailableReason, { bg: string; color: string; label: string }> = {
  draft:    { bg: 'rgba(255,201,77,0.22)',   color: '#8a6800', label: 'Draft'    },
  disabled: { bg: 'rgba(250,103,129,0.16)',  color: '#a02040', label: 'Disabled' },
};

const DESCRIPTION: Record<UnavailableReason, string> = {
  draft:    'This booklet has not been published yet.',
  disabled: 'This booklet is currently unavailable.',
};

interface Props {
  reason: UnavailableReason;
}

export function UnavailableBookletPage({ reason }: Props) {
  const badge = BADGE[reason];

  return (
    <div
      id="reader-root"
      translate="no"
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: BRAND.green,
        overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
      }}
    >
      <BgShapes />

      {/* Card */}
      <div
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 440,
          margin: '0 24px',
          backgroundColor: BRAND.cream,
          borderRadius: 24,
          padding: '52px 44px 48px',
          boxShadow: '0 8px 0 rgba(0,0,0,0.08), 0 24px 64px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Icon */}
        <div style={{
          width: 88, height: 88, borderRadius: 28,
          backgroundColor: BRAND.green,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 28,
          boxShadow: '0 4px 20px rgba(89,178,146,0.38)',
        }}>
          <BookOpen size={40} color="#fff" strokeWidth={1.7} />
        </div>

        {/* Status badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          backgroundColor: badge.bg, color: badge.color,
          borderRadius: 20, padding: '4px 14px',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
          textTransform: 'uppercase',
          marginBottom: 20,
        }}>
          {badge.label}
        </div>

        {/* Title */}
        <h1 style={{
          margin: '0 0 14px',
          fontSize: 22, fontWeight: 700,
          color: BRAND.text,
          lineHeight: 1.3,
          letterSpacing: '-0.01em',
        }}>
          This booklet is currently unavailable
        </h1>

        {/* Description */}
        <p style={{
          margin: 0,
          fontSize: 15, color: BRAND.textMuted,
          lineHeight: 1.6,
          maxWidth: 300,
        }}>
          {DESCRIPTION[reason]}
        </p>
      </div>
    </div>
  );
}
