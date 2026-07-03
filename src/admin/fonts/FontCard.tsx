import { useState } from 'react';
import type { FontRow } from '@/types/database';
import { type CardPalette } from '@/admin/shell/adminControls';
import { FontPreview } from './FontPreview';

// A single registered-font specimen row: name + weight badge on the left, live
// preview filling the rest. Hover lift is owned per-row.
export function FontCard({ font, palette }: { font: FontRow; palette: CardPalette }) {
  const [hovered, setHovered] = useState(false);

  return (
    <li
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: palette.bg,
        borderRadius: 18,
        padding: '18px 28px',
        boxShadow: hovered
          ? '0 14px 34px rgba(0,0,0,0.18), 0 5px 14px rgba(0,0,0,0.1)'
          : '0 6px 18px rgba(0,0,0,0.12), 0 2px 5px rgba(0,0,0,0.07)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        // Color inheritance — FontPreview's <p> picks up the row's text color
        color: palette.text,
      }}
    >
      {/* Font name + weight badge — fixed-width left column */}
      <div style={{
        flexShrink: 0,
        width: 220,
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        borderRight: `1px solid ${palette.text === '#fff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)'}`,
        paddingRight: 20,
      }}>
        <span style={{
          fontSize: 15,
          fontWeight: 800,
          color: palette.text,
          letterSpacing: '-0.2px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {font.name}
        </span>
        <span style={{
          alignSelf: 'flex-start',
          display: 'inline-block',
          padding: '4px 11px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.3px',
          textTransform: 'capitalize',
          backgroundColor: palette.badgeBg,
          color: palette.badgeText,
        }}>
          {font.weight}
        </span>
      </div>

      {/* Font preview — fills the rest of the row */}
      <div style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
      }}>
        <FontPreview font={font} />
      </div>
    </li>
  );
}
