import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BRAND } from '@/config/theme';
import {
  CREDITS_PANEL_HEIGHT,
  CREDITS_PANEL_HEIGHT_MOBILE,
  CREDITS_PANEL_LABEL_FONT_SIZE,
  CREDITS_PANEL_LABEL_FONT_SIZE_MOBILE,
  CREDITS_PANEL_LOGO_HEIGHT,
  CREDITS_PANEL_LOGO_HEIGHT_MOBILE,
  CREDITS_PANEL_LOGO_URL,
  CREDITS_PANEL_SHORT_SCREEN_HEIGHT,
  VOCABULARY_PANEL_HANDLE_WIDTH,
  VOCABULARY_PANEL_PADDING,
  VOCABULARY_PANEL_SLIDE_MS,
} from '@/config/vocabulary';
import { useViewportHeight } from '@/hooks/useViewportWidth';

// Left-sidebar credits panel — same slide-in-from-left pattern as VocabularyPanel.
// Sits below the Dictionary panel in the sidebar container owned by
// ReaderBookletPage. Always rendered (not tied to page vocabulary or cover state).
export function CreditsPanel({ closeSignal }: {
  // Bumped by the reader whenever a page turn occurs — collapse on change so a
  // flip never leaves the credits open over the new spread.
  closeSignal?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  // Compact the whole card ONLY on a SHORT screen (low viewport height), where the
  // fixed-height credits would otherwise hog the vertical rail. Height-only by
  // design: a large/regular screen keeps the original size. 0 during SSR ⇒ treated
  // as regular (larger) until the real height arrives.
  const viewportHeight = useViewportHeight();
  const compact = viewportHeight > 0 && viewportHeight < CREDITS_PANEL_SHORT_SCREEN_HEIGHT;
  const panelHeight = compact ? CREDITS_PANEL_HEIGHT_MOBILE : CREDITS_PANEL_HEIGHT;
  const logoHeight = compact ? CREDITS_PANEL_LOGO_HEIGHT_MOBILE : CREDITS_PANEL_LOGO_HEIGHT;
  const labelFontSize = compact ? CREDITS_PANEL_LABEL_FONT_SIZE_MOBILE : CREDITS_PANEL_LABEL_FONT_SIZE;
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyWidth, setBodyWidth] = useState(0);
  // Re-measure the rendered body width. The body is dominated by a wide,
  // width:auto logo image whose intrinsic size is unknown until the file
  // loads — measuring only on mount captures a too-small (often 0-width)
  // value, so the collapsed translateX never fully hides the panel and it
  // opens to the wrong width. Called on mount, on image load, and on resize.
  const measure = () => {
    if (bodyRef.current) setBodyWidth(bodyRef.current.offsetWidth);
  };
  // Transition is armed only for user-initiated toggles, never on mount,
  // mirroring VocabularyPanel's approach so the initial paint has no slide.
  const [slideEnabled, setSlideEnabled] = useState(false);
  // Mirrors `expanded` for the page-turn close effect, which must read the
  // latest open state without depending on `expanded` (that would make opening
  // the panel immediately re-close it).
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  useLayoutEffect(() => {
    setSlideEnabled(false);
    measure();
    // The collapsed offset is width-driven, so keep it correct across viewport
    // changes (chrome scale, orientation) — without re-arming the slide.
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Entering/leaving compact mode resizes the banner image, so the body's width
  // changes — re-measure (post-render) so the collapsed translateX stays exact.
  useLayoutEffect(() => {
    measure();
  }, [compact]);

  // Collapse on every page turn (signalled by the reader), but ONLY if open:
  // arm the slide so it glides shut. If already closed, do nothing.
  useEffect(() => {
    if (!expandedRef.current) return;
    setSlideEnabled(true);
    setExpanded(false);
  }, [closeSignal]);

  return (
    <div
      style={{
        transform: `translateX(${expanded ? 0 : -bodyWidth}px)`,
        transition: slideEnabled
          ? `transform ${VOCABULARY_PANEL_SLIDE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
          : 'none',
        // Pinned to the bottom of the rail at full height — never shrinks, so on
        // short screens the flexible Dictionary slot above absorbs the squeeze
        // instead (see ReaderBookletPage's left-sidebar rail).
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        // Re-enable clicks: the parent wrapper sets pointer-events:none (so its
        // wider, untransformed DOM box can't block the prev/next nav). That
        // none inherits to children, so restore auto here. This root is
        // translateX-shifted, so its hit area follows the visual position —
        // when collapsed only the handle peeks out, leaving nav clickable.
        pointerEvents: 'auto',
      }}
    >
      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div
        ref={bodyRef}
        style={{
          height: panelHeight,
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
            <div
              style={{
                fontSize: labelFontSize,
                color: "#323030",
                fontWeight: 700,
                letterSpacing: '0.03em',
                textAlign: 'center',
              }}
            >
              Designed and Developed by :
            </div>
            <img
              src="/abc.png"
              alt="ABC | Brachi Lubling"
              // Re-measure once the wide banner's real size is known, so the
              // collapsed offset and opened width match the image exactly.
              onLoad={measure}
              style={{
                height: logoHeight,
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
          height: panelHeight,
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
