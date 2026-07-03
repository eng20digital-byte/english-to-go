import { BRAND } from '@/config/theme';

// Decorative paper-cut background shapes for the reader chrome — same visual
// language as the admin pages, but its own reader-side set (per the CLAUDE.md
// admin/reader boundary, these are deliberately not shared with the admin
// AdminBackgroundShapes).
export function ReaderBgShapes() {
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
