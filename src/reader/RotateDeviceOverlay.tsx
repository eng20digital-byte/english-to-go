import { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { ROTATE_DEVICE_MEDIA_QUERY } from '@/config/reader';
import { BRAND } from '@/config/theme';

// Full-screen "please rotate your device" gate for the public reader.
//
// The booklet is a fixed 16:9 LANDSCAPE canvas, so in portrait on a phone/tablet
// it collapses to an unreadable strip. Rather than force-rotate the content (which
// scrambles swipe/scroll directions), we simply cover the screen while the device
// is held portrait and let the reader turn it — the standard, gesture-safe pattern.
//
// The whole detection is a single matchMedia listener on
// ROTATE_DEVICE_MEDIA_QUERY (`portrait` AND `pointer: coarse`), so a desktop
// window that merely happens to be tall is never blocked — only real touch
// devices, where "rotate" is a meaningful instruction. Reduced-motion is handled
// in the .rotate-device-icon CSS (index.css), which holds a static landscape tilt.
export function RotateDeviceOverlay() {
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(ROTATE_DEVICE_MEDIA_QUERY);
    const update = () => setPortrait(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  if (!portrait) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: BRAND.green,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        padding: 32,
        textAlign: 'center',
        color: '#fff',
      }}
    >
      <Smartphone
        className="rotate-device-icon"
        size={76}
        strokeWidth={1.5}
        style={{
          animation: 'rotate-device-hint 2.4s ease-in-out infinite',
          // Pivot from the icon's centre so it tips rather than swings.
          transformOrigin: '50% 50%',
        }}
      />
      <div style={{ maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '0.01em' }}>
          Please rotate your device
        </p>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,0.85)' }}>
          This booklet is best read in landscape. Turn your device sideways to continue.
        </p>
      </div>
    </div>
  );
}
