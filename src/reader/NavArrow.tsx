import { BRAND } from '@/config/theme';

// Prev/next arrow visual config, keyed by direction. Pulled out of the render
// body so the single <NavArrow> component below can be reused both flanking the
// book (desktop) and stacked in a bottom bar (mobile) without duplicating the
// full style block per placement.
const NAV_ARROW_STYLE = {
  prev: {
    disabledBg: 'rgba(250,103,129,0.18)',
    hoverBg: BRAND.pink,
    bg: 'rgba(250,103,129,0.82)',
    disabledColor: 'rgba(26,26,26,0.22)',
    color: '#fff',
    hoverShadow: '0 8px 24px rgba(250,103,129,0.5)',
    shadow: '0 4px 16px rgba(250,103,129,0.32)',
    label: 'Previous page',
    path: 'M15 18L9 12L15 6',
  },
  next: {
    disabledBg: 'rgba(255,201,77,0.18)',
    hoverBg: BRAND.yellow,
    bg: 'rgba(255,201,77,0.88)',
    disabledColor: 'rgba(26,26,26,0.18)',
    color: BRAND.text,
    hoverShadow: '0 8px 24px rgba(255,201,77,0.5)',
    shadow: '0 4px 16px rgba(255,201,77,0.35)',
    label: 'Next page',
    path: 'M9 18L15 12L9 6',
  },
} as const;

export function NavArrow({
  direction,
  disabled,
  hover,
  onHoverChange,
  onClick,
  isMobile,
}: {
  direction: 'prev' | 'next';
  disabled: boolean;
  hover: boolean;
  onHoverChange: (v: boolean) => void;
  onClick: () => void;
  isMobile: boolean;
}) {
  const s = NAV_ARROW_STYLE[direction];
  return (
    <button
      type="button"
      aria-label={s.label}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      style={{
        flexShrink: 0,
        transform: `scale(${!disabled && hover ? 1.08 : 1})`,
        zIndex: 20,
        // Flanking the book (desktop) → tall/narrow; in the bottom bar (mobile)
        // → wide/short for a comfortable thumb target clear of the side rail.
        width: isMobile ? 64 : 44,
        height: isMobile ? 46 : 60,
        borderRadius: 14,
        border: 'none',
        backgroundColor: disabled ? s.disabledBg : hover ? s.hoverBg : s.bg,
        color: disabled ? s.disabledColor : s.color,
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: disabled ? 'none' : hover ? s.hoverShadow : s.shadow,
        backdropFilter: disabled ? 'none' : 'blur(10px)',
        transition: 'background-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
        fontFamily: 'inherit',
      }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={s.path}/></svg>
    </button>
  );
}
