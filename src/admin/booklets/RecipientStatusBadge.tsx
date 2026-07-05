import { type EffectiveStatus, EFFECTIVE_STATUS_LABELS } from '@/config/recipients';
import { BRAND } from '@/config/theme';

// Same visual language as StatusBadge (white pill + colored dot, legible on any
// card background): Published = green, Unpublished = muted, Expired = pink (the
// "was live, now revoked" language `disabled` uses in StatusBadge). Driven by the
// effective status so "Expired" shows the instant the date passes, before the
// lazy DB flip.
const DOT: Record<EffectiveStatus, { dot: string; text: string }> = {
  published: { dot: BRAND.green, text: '#1e6647' },
  unpublished: { dot: 'rgba(0,0,0,0.32)', text: BRAND.textMuted },
  expired: { dot: BRAND.pink, text: '#a82040' },
};

export function RecipientStatusBadge({ status }: { status: EffectiveStatus }) {
  const c = DOT[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.2px',
        backgroundColor: 'rgba(255,255,255,0.93)',
        color: c.text,
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: c.dot, flexShrink: 0 }}
      />
      {EFFECTIVE_STATUS_LABELS[status]}
    </span>
  );
}
