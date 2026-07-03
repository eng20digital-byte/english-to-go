import { type CSSProperties } from 'react';
import { BRAND } from '@/config/theme';

// The decorative flat paper-cut shapes that erupt from every admin page's
// viewport edges. Previously each page inlined ~55 lines of positioned <div>s;
// here every page's exact arrangement is expressed as compact data and one
// renderer draws them, so the boilerplate is unified without changing any
// page's appearance (positions/colors/shadows are preserved per variant).
interface Shape {
  bg: string;
  width: number;
  height: number;
  radius: number | string;
  top?: number | string;
  left?: number | string;
  right?: number | string;
  bottom?: number | string;
  rotate?: number;
  opacity?: number;
  shadow?: string;
}

export type AdminBgVariant = 'login' | 'dashboard' | 'booklets' | 'fonts' | 'media';

const VARIANTS: Record<AdminBgVariant, Shape[]> = {
  login: [
    { bg: BRAND.yellow, top: -130, left: -150, width: 420, height: 420, radius: '50%', shadow: '10px 14px 0 rgba(0,0,0,0.09)' },
    { bg: BRAND.pink, bottom: -110, right: -90, width: 380, height: 320, radius: 60, rotate: 14, shadow: '-8px -10px 0 rgba(0,0,0,0.08)' },
    { bg: BRAND.cream, bottom: -80, left: -90, width: 280, height: 280, radius: '50%', shadow: '8px 8px 0 rgba(0,0,0,0.07)' },
    { bg: BRAND.pink, top: -90, right: '8%', width: 130, height: 300, radius: 65, opacity: 0.65, rotate: -22 },
    { bg: BRAND.yellow, top: '34%', right: -95, width: 220, height: 220, radius: '50%', opacity: 0.6, shadow: '-6px 6px 0 rgba(0,0,0,0.07)' },
    { bg: BRAND.cream, top: '22%', left: -50, width: 140, height: 140, radius: '50%', opacity: 0.5 },
  ],
  dashboard: [
    { bg: BRAND.yellow, top: -100, right: -120, width: 380, height: 380, radius: '50%', shadow: '-10px 12px 0 rgba(0,0,0,0.09)' },
    { bg: BRAND.pink, bottom: -90, left: -80, width: 340, height: 290, radius: 55, rotate: -12, shadow: '8px -8px 0 rgba(0,0,0,0.08)' },
    { bg: BRAND.cream, bottom: -60, right: '6%', width: 240, height: 240, radius: '50%', opacity: 0.55, shadow: '-6px -6px 0 rgba(0,0,0,0.06)' },
    { bg: BRAND.yellow, top: '38%', left: -65, width: 120, height: 270, radius: 60, opacity: 0.55, rotate: 18 },
    { bg: BRAND.pink, top: '14%', left: '14%', width: 80, height: 80, radius: '50%', opacity: 0.22 },
    { bg: BRAND.cream, top: '55%', right: -40, width: 130, height: 130, radius: '50%', opacity: 0.35 },
  ],
  booklets: [
    { bg: BRAND.yellow, top: -130, left: -150, width: 420, height: 420, radius: '50%', shadow: '10px 14px 0 rgba(0,0,0,0.09)' },
    { bg: BRAND.pink, bottom: -100, right: -90, width: 360, height: 310, radius: 58, rotate: 13, shadow: '-8px -10px 0 rgba(0,0,0,0.08)' },
    { bg: BRAND.cream, bottom: -70, left: -60, width: 250, height: 250, radius: '50%', opacity: 0.55, shadow: '8px 6px 0 rgba(0,0,0,0.06)' },
    { bg: BRAND.yellow, top: '32%', right: -70, width: 130, height: 300, radius: 65, opacity: 0.55, rotate: -18 },
    { bg: BRAND.pink, top: '10%', left: '12%', width: 90, height: 170, radius: 45, opacity: 0.22, rotate: 28 },
    { bg: BRAND.cream, top: '58%', right: -40, width: 130, height: 130, radius: '50%', opacity: 0.38 },
  ],
  fonts: [
    { bg: BRAND.yellow, top: -120, right: -140, width: 400, height: 400, radius: '50%', shadow: '-10px 12px 0 rgba(0,0,0,0.09)' },
    { bg: BRAND.pink, bottom: -90, right: -80, width: 340, height: 290, radius: 55, rotate: 12, shadow: '-8px -8px 0 rgba(0,0,0,0.08)' },
    { bg: BRAND.cream, bottom: -60, left: -80, width: 260, height: 260, radius: '50%', opacity: 0.55, shadow: '8px 6px 0 rgba(0,0,0,0.06)' },
    { bg: BRAND.pink, top: -80, left: '10%', width: 120, height: 280, radius: 60, opacity: 0.6, rotate: 22 },
    { bg: BRAND.yellow, top: '38%', left: -80, width: 200, height: 200, radius: '50%', opacity: 0.5, shadow: '6px 6px 0 rgba(0,0,0,0.07)' },
    { bg: BRAND.cream, top: '55%', right: -40, width: 130, height: 130, radius: '50%', opacity: 0.38 },
  ],
  media: [
    { bg: BRAND.yellow, top: -120, left: -140, width: 400, height: 400, radius: '50%', shadow: '10px 12px 0 rgba(0,0,0,0.09)' },
    { bg: BRAND.pink, top: -60, right: -80, width: 300, height: 280, radius: 50, rotate: 18, shadow: '-8px 10px 0 rgba(0,0,0,0.08)' },
    { bg: BRAND.cream, bottom: -70, left: -60, width: 240, height: 240, radius: '50%', opacity: 0.55, shadow: '8px 6px 0 rgba(0,0,0,0.06)' },
    { bg: BRAND.yellow, top: '30%', right: -65, width: 120, height: 280, radius: 60, opacity: 0.55, rotate: -20 },
    { bg: BRAND.pink, bottom: -70, right: '10%', width: 200, height: 180, radius: 40, opacity: 0.35, rotate: 8 },
    { bg: BRAND.cream, top: '45%', left: -40, width: 120, height: 120, radius: '50%', opacity: 0.4 },
  ],
};

export function AdminBackgroundShapes({ variant }: { variant: AdminBgVariant }) {
  return (
    <>
      {VARIANTS[variant].map((s, i) => {
        const style: CSSProperties = {
          position: 'absolute',
          top: s.top,
          left: s.left,
          right: s.right,
          bottom: s.bottom,
          width: s.width,
          height: s.height,
          borderRadius: s.radius,
          backgroundColor: s.bg,
          opacity: s.opacity,
          transform: s.rotate !== undefined ? `rotate(${s.rotate}deg)` : undefined,
          boxShadow: s.shadow,
          pointerEvents: 'none',
        };
        return <div key={i} style={style} />;
      })}
    </>
  );
}
