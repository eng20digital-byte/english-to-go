import { BRAND } from '@/config/theme';

// Loading placeholder for a booklet card — mirrors the real card's silhouette
// (icon + badge row, title, subtitle, separator, action buttons) with pulsing
// blocks while the library query is in flight.
export function BookletCardSkeleton() {
  return (
    <div style={{
      backgroundColor: BRAND.cream,
      borderRadius: 24,
      padding: '28px 28px 24px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(89,178,146,0.15)', animation: 'sk-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: 72, height: 22, borderRadius: 11, backgroundColor: 'rgba(26,26,26,0.08)', animation: 'sk-pulse 1.5s ease-in-out infinite' }} />
      </div>
      <div style={{ height: 22, width: '70%', borderRadius: 6, backgroundColor: 'rgba(26,26,26,0.1)', marginBottom: 10, animation: 'sk-pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: 13, width: '88%', borderRadius: 4, backgroundColor: 'rgba(26,26,26,0.06)', marginBottom: 20, animation: 'sk-pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ height: 34, width: 72, borderRadius: 10, backgroundColor: 'rgba(89,178,146,0.2)', animation: 'sk-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 34, width: 80, borderRadius: 10, backgroundColor: 'rgba(255,201,77,0.25)', animation: 'sk-pulse 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  );
}
