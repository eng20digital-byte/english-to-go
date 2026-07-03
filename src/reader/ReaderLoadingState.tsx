import { BRAND } from '@/config/theme';
import { ReaderBgShapes } from './ReaderBgShapes';

// Full-screen reader loading skeleton — a pulsing book card + dot row over the
// brand backdrop, shown while the booklet (and its cover image) load.
export function ReaderLoadingState() {
  return (
    <div id="reader-root" translate="no" style={{
      position: 'fixed', inset: 0,
      backgroundColor: BRAND.green, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
    }}>
      <ReaderBgShapes />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 420, height: 236, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', animation: 'sk-pulse 1.5s ease-in-out infinite', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ width: i === 0 ? 20 : 8, height: 8, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)', animation: 'sk-pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
