import { useLayoutEffect, useRef, useState } from 'react';
import { BRAND } from '@/config/theme';
import {
  CREDITS_PANEL_HEIGHT,
  CREDITS_PANEL_LOGO_URL,
  VOCABULARY_PANEL_HANDLE_WIDTH,
  VOCABULARY_PANEL_PADDING,
  VOCABULARY_PANEL_SLIDE_MS,
} from '@/config/vocabulary';

// Left-sidebar credits panel — same slide-in-from-left pattern as VocabularyPanel.
// Sits below the Dictionary panel in the sidebar container owned by
// ReaderBookletPage. Always rendered (not tied to page vocabulary or cover state).
export function CreditsPanel() {
  const [expanded, setExpanded] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyWidth, setBodyWidth] = useState(0);
  // Transition is armed only for user-initiated toggles, never on mount,
  // mirroring VocabularyPanel's approach so the initial paint has no slide.
  const [slideEnabled, setSlideEnabled] = useState(false);

  useLayoutEffect(() => {
    setSlideEnabled(false);
    if (bodyRef.current) setBodyWidth(bodyRef.current.offsetWidth);
  }, []);

  return (
    <div
      style={{
        transform: `translateX(${expanded ? 0 : -bodyWidth}px)`,
        transition: slideEnabled
          ? `transform ${VOCABULARY_PANEL_SLIDE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
          : 'none',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div
        ref={bodyRef}
        style={{
          height: CREDITS_PANEL_HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: `0 ${VOCABULARY_PANEL_PADDING}px`,
          backgroundColor: BRAND.cream,
          boxShadow: '2px 4px 18px rgba(0,0,0,0.22)',
          whiteSpace: 'nowrap',
        }}
      >
          <a
            href={CREDITS_PANEL_LOGO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit ABC"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              gap: 8,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 10,
                  color: BRAND.textMuted,
                  fontWeight: 500,
                  letterSpacing: '0.03em',
                }}
              >
                Designed and Developed by
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: BRAND.text,
                  marginTop: 0,
                }}
              >
                ABC | Brachi Lubling
              </div>
            </div>
            <img
              src="/abc.png"
              alt="ABC logo"
              style={{
                height: 60,
                width: 'auto',
                display: 'block',
                objectFit: 'contain',
              }}
            />
          </a>
      </div>

      {/* ── Handle tab — always-visible peeking part ────────────────────── */}
      <button
        type="button"
        aria-label={expanded ? 'Close credits' : 'Open credits'}
        aria-expanded={expanded}
        onClick={() => {
          setSlideEnabled(true);
          setExpanded((v) => !v);
        }}
        style={{
          flexShrink: 0,
          width: VOCABULARY_PANEL_HANDLE_WIDTH,
          height: CREDITS_PANEL_HEIGHT,
          border: 'none',
          padding: 0,
          backgroundColor: BRAND.cream,
          borderTopRightRadius: 16,
          borderBottomRightRadius: 16,
          boxShadow: '2px 4px 18px rgba(0,0,0,0.22)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: expanded ? BRAND.green : BRAND.textMuted,
          transition: 'color 0.2s',
          fontFamily: 'inherit',
        }}
      >
        <span
          style={{
            display: 'block',
            transform: 'rotate(90deg)',
            fontSize: 13,
            fontWeight: 650,
            letterSpacing: 0.5,
            whiteSpace: 'nowrap',
          }}
        >
          Credits
        </span>
      </button>
    </div>
  );
}
