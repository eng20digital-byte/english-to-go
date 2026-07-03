import { BRAND } from '@/config/theme';
import { ReaderBgShapes } from './ReaderBgShapes';

// Full-screen reader error/empty state — an icon bubble + message over the
// brand backdrop (not-found, load failure, empty booklet).
export function ReaderError({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div id="reader-root" translate="no" style={{
      position: 'fixed', inset: 0,
      backgroundColor: BRAND.green, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
    }}>
      <ReaderBgShapes />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', padding: '0 24px' }}>
        <div style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.82)', fontSize: 15, maxWidth: 225, lineHeight: 1.5 }}>{message}</p>
      </div>
    </div>
  );
}
