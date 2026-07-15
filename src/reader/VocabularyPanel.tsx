import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { BRAND } from '@/config/theme';
import { TTS_ACTIVE_WORD_STYLE } from '@/config/tts';
import {
  DEFAULT_VOCABULARY_BUBBLE_BACKGROUND,
  DEFAULT_VOCABULARY_BUBBLE_BORDER_COLOR,
  VOCABULARY_PANEL_CHIP_FONT_SIZE,
  VOCABULARY_PANEL_CHIP_FONT_SIZE_MOBILE,
  VOCABULARY_PANEL_CHIP_HEIGHT,
  VOCABULARY_PANEL_CHIP_HEIGHT_MOBILE,
  VOCABULARY_PANEL_COLUMN_GAP,
  VOCABULARY_PANEL_COLUMN_MIN_WIDTH,
  VOCABULARY_PANEL_COLUMN_MIN_WIDTH_MOBILE,
  VOCABULARY_PANEL_HANDLE_WIDTH,
  VOCABULARY_PANEL_HEADER_HEIGHT,
  VOCABULARY_PANEL_HEIGHT,
  VOCABULARY_PANEL_MAX_WIDTH,
  VOCABULARY_PANEL_MOBILE_BREAKPOINT,
  VOCABULARY_PANEL_PADDING,
  VOCABULARY_PANEL_ROW_GAP,
  VOCABULARY_PANEL_SLIDE_MS,
  VOCABULARY_PANEL_VIEWPORT_RESERVE,
  VOCABULARY_PANEL_VIEWPORT_WIDTH_RATIO,
  VOCABULARY_WORD_SEPARATOR,
  sidebarHandleRadius,
  sidebarPanelShadow,
} from '@/config/vocabulary';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import { useWordSpeech } from '@/tts/useWordSpeech';
import type { ReaderBookletPage } from '@/hooks/useBookletQuery';
import type { VocabularyWord } from '@/types/elements';

// Collects every vocabulary pair from the vocabulary elements on a SINGLE page
// into one deduplicated, first-seen-ordered list — the panel is page-aware, so
// it always mirrors the page currently in view (see VocabularyPanel below).
// Kept as a module-local pure function (not in a page/render component —
// CLAUDE.md rule #1) so the panel owns aggregation end-to-end. Dedupe key is
// case-insensitive on the English word + exact Hebrew, so "Giant/ענק" and
// "giant/ענק" collapse to one chip. Words from elements hidden on the page
// (props.show_on_page === false) are still included — hiding the on-page
// bubbles must not remove the data from the panel.
function collectPageVocabulary(page: ReaderBookletPage | undefined): VocabularyWord[] {
  if (!page) return [];
  const seen = new Set<string>();
  const result: VocabularyWord[] = [];
  for (const element of page.elements) {
    if (element.type !== 'vocabulary') continue;
    for (const word of element.props.words) {
      const english = word.english.trim();
      const hebrew = word.hebrew.trim();
      if (!english && !hebrew) continue;
      const key = `${english.toLowerCase()}|${hebrew}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ english, hebrew });
    }
  }
  return result;
}

// Splits a flat list into fixed-height columns: fill a column top-to-bottom,
// then start the next. The number of columns falls out of the word count —
// more words => more columns => a wider panel, with no vertical scroll.
function splitIntoColumns<T>(items: T[], rowsPerColumn: number): T[][] {
  const columns: T[][] = [];
  for (let i = 0; i < items.length; i += rowsPerColumn) {
    columns.push(items.slice(i, i + rowsPerColumn));
  }
  return columns;
}

function VocabChip({
  word,
  chipHeight,
  fontSize,
}: {
  word: VocabularyWord;
  chipHeight: number;
  fontSize: number;
}) {
  const { speak, speakingWordKey } = useWordSpeech();
  const wordKey = `vocab-panel:${word.english.toLowerCase()}|${word.hebrew}`;
  const isSpeaking = speakingWordKey === wordKey;

  return (
    <div
      style={{
        height: chipHeight,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
        backgroundColor: DEFAULT_VOCABULARY_BUBBLE_BACKGROUND,
        border: `1px solid ${DEFAULT_VOCABULARY_BUBBLE_BORDER_COLOR}`,
        borderRadius: 999,
        fontSize,
        color: BRAND.text,
        // Never wrap or clip — each chip hugs its content so the full English +
        // Hebrew word is always shown in one line (the panel widens instead; see
        // the width logic below).
        whiteSpace: 'nowrap',
        ...(isSpeaking ? TTS_ACTIVE_WORD_STYLE : null),
      }}
    >
      {/* Speaker — reads the English word via the shared TTS session (same
          rate/voice settings as the speech-rate control). */}
      <button
        type="button"
        aria-label={`Speak "${word.english}"`}
        onClick={() => speak(word.english, wordKey)}
        style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          padding: 0,
          border: 'none',
          borderRadius: '50%',
          backgroundColor: 'rgba(0,0,0,0.06)',
          color: BRAND.green,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'inherit',
        }}
      >
        <Volume2 size={13} />
      </button>
      <span dir="ltr" style={{ fontWeight: 600 }}>{word.english}</span>
      <span aria-hidden style={{ flexShrink: 0, color: BRAND.textMuted }}>{VOCABULARY_WORD_SEPARATOR}</span>
      <span dir="rtl">{word.hebrew}</span>
    </div>
  );
}

// Page-aware vocabulary list, always reachable while reading. Shows only the
// words on the page currently in view and updates automatically when the
// reader flips pages (the parent passes the current page, which changes on
// flip). Mirrors the speech-rate control's interaction: a rounded tab peeks
// from the right edge and the body slides in/out. Collapsed by default. Lives
// in reader chrome (#reader-root), so inline-styled utilities are fine here —
// never touches PageCanvas or the element renderers.
export function VocabularyPanel({
  page,
  closeSignal,
}: {
  page: ReaderBookletPage | undefined;
  // Bumped by the reader whenever a page turn occurs — collapse on change so a
  // flip never leaves the dictionary open over the new spread.
  closeSignal?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  // Measured body width drives the collapse distance, so the slide always
  // matches the panel's actual (column-count-dependent) width.
  const [contentWidth, setContentWidth] = useState(0);
  // The panel now STRETCHES to fill the flexible rail slot between the speaker
  // and the credits (see ReaderBookletPage), so its height is no longer the
  // fixed VOCABULARY_PANEL_HEIGHT — it's whatever the slot grants, measured
  // live so the rows-per-column split (below) always fits the actual height and
  // never overflows into the credits. VOCABULARY_PANEL_HEIGHT is only the
  // pre-measurement fallback for the first paint.
  const [measuredHeight, setMeasuredHeight] = useState(VOCABULARY_PANEL_HEIGHT);
  // The slide transition must fire ONLY for a user-initiated expand/collapse —
  // never as a side effect of a page change. On flip, the panel's measured
  // width (and thus its collapsed offset `translateX(contentWidth)`) can
  // change, which would otherwise animate the panel into place on every page
  // turn (the distracting "entry animation"). So the transition is off by
  // default, armed for exactly one toggle by the handle's onClick, and disarmed
  // again whenever the page's words change (the layout effect below).
  const [slideEnabled, setSlideEnabled] = useState(false);
  // Mirrors `expanded` for the page-turn close effect, which must read the
  // latest open state WITHOUT depending on `expanded` (that would make opening
  // the panel immediately re-close it).
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  const words = useMemo(() => collectPageVocabulary(page), [page]);

  // Below the breakpoint, use compact chip metrics so more words fit a short
  // slot (more rows per column ⇒ fewer columns). viewportWidth === 0 only during
  // SSR/first tick — treat as desktop (the larger, safer layout) until the real
  // width arrives.
  const viewportWidth = useViewportWidth();
  const isMobile = viewportWidth > 0 && viewportWidth < VOCABULARY_PANEL_MOBILE_BREAKPOINT;
  const chipHeight = isMobile ? VOCABULARY_PANEL_CHIP_HEIGHT_MOBILE : VOCABULARY_PANEL_CHIP_HEIGHT;
  const chipFontSize = isMobile ? VOCABULARY_PANEL_CHIP_FONT_SIZE_MOBILE : VOCABULARY_PANEL_CHIP_FONT_SIZE;
  const colMinWidth = isMobile
    ? VOCABULARY_PANEL_COLUMN_MIN_WIDTH_MOBILE
    : VOCABULARY_PANEL_COLUMN_MIN_WIDTH;

  // Width bound: columns hug their content (so every word shows in full — chips
  // never wrap or clip), but the body never grows past this cap. On large screens
  // the absolute MAX_WIDTH keeps it from covering the book; on small screens the
  // viewport-ratio path lets it use most of the width — so the panel opens *wider*
  // (as a share of the screen) on phones.
  const effectiveViewport = viewportWidth > 0 ? viewportWidth : VOCABULARY_PANEL_MAX_WIDTH;
  const maxBodyWidth = Math.min(
    VOCABULARY_PANEL_MAX_WIDTH,
    effectiveViewport * VOCABULARY_PANEL_VIEWPORT_WIDTH_RATIO - VOCABULARY_PANEL_VIEWPORT_RESERVE,
  );

  // Measured inner height -> how many chips fit ONE screenful of a column.
  // Clamped at 0 so a very short slot can't produce a negative height.
  const innerHeight = Math.max(
    0,
    measuredHeight -
      VOCABULARY_PANEL_PADDING * 2 -
      VOCABULARY_PANEL_HEADER_HEIGHT -
      VOCABULARY_PANEL_ROW_GAP,
  );
  const rowsPerScreen = Math.max(
    1,
    Math.floor((innerHeight + VOCABULARY_PANEL_ROW_GAP) / (chipHeight + VOCABULARY_PANEL_ROW_GAP)),
  );
  // How many columns the width cap allows (each at least colMinWidth wide).
  const maxColumns = Math.max(
    1,
    Math.floor(
      (maxBodyWidth - VOCABULARY_PANEL_PADDING * 2 + VOCABULARY_PANEL_COLUMN_GAP) /
        (colMinWidth + VOCABULARY_PANEL_COLUMN_GAP),
    ),
  );
  // Prefer to fill the height first (few words ⇒ one/few short columns, a compact
  // panel), adding columns only as the list outgrows a screenful — but never more
  // columns than the width allows. When even the width-capped columns are taller
  // than the slot, the body scrolls VERTICALLY (see `scrollsVertically`) rather
  // than clipping the bottom words.
  const columnsToFillHeight = Math.max(1, Math.ceil(words.length / rowsPerScreen));
  const numColumns = Math.max(1, Math.min(columnsToFillHeight, maxColumns, words.length));
  const rowsPerColumn = Math.max(1, Math.ceil(words.length / numColumns));
  const columns = useMemo(() => splitIntoColumns(words, rowsPerColumn), [words, rowsPerColumn]);

  // useLayoutEffect (pre-paint) so the initial collapsed offset is correct on
  // first paint — no flash of the open panel. Re-measures when anything that
  // changes the body's rendered width does: the column layout (words add/remove),
  // the compact chip metrics, or the width cap (viewport change) — so the
  // collapsed `translateX(contentWidth)` stays exact.
  useLayoutEffect(() => {
    // A layout input changed — disarm the slide so the re-measured collapsed
    // offset applies instantly (no entry animation on a page/viewport change),
    // then re-measure.
    setSlideEnabled(false);
    if (contentRef.current) setContentWidth(contentRef.current.offsetWidth);
  }, [columns, chipHeight, colMinWidth, maxBodyWidth]);

  // Track the height the rail slot grants this panel (it stretches to fill the
  // space between the speaker and the credits, and that space changes with the
  // viewport). Feeding the measured height back into `measuredHeight` re-derives
  // rows-per-column, so the word columns always fit the current height. Reading
  // the body's clientHeight (its `height:100%` resolves to the slot height) and
  // only writing when it actually changes avoids a resize loop with the
  // column-count → width re-measure above.
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const update = () => {
      setMeasuredHeight((prev) => (prev === el.clientHeight ? prev : el.clientHeight));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Collapse on every page turn (signalled by the reader), but ONLY if the
  // panel is currently open: arm the slide so it glides shut. If it's already
  // closed, do nothing — touching `slideEnabled` here would let the per-page
  // width re-measure animate the collapsed panel sideways (a distracting
  // "re-entry" on every flip). At flip start the page hasn't changed yet, so
  // the width stays stable through the close animation.
  useEffect(() => {
    if (!expandedRef.current) return;
    setSlideEnabled(true);
    setExpanded(false);
  }, [closeSignal]);

  if (words.length === 0) return null;

  return (
    <div
      translate="no"
      style={{
        // Positioning is handled by the parent sidebar container in
        // ReaderBookletPage — this component is a plain flex-row child.
        // translateX hides the body off the RIGHT edge, leaving only the handle
        // tab visible when collapsed; the parent centers the whole sidebar
        // vertically.
        transform: `translateX(${expanded ? 0 : contentWidth}px)`,
        transition: slideEnabled
          ? `transform ${VOCABULARY_PANEL_SLIDE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
          : 'none',
        // Fill the rail's flexible middle slot so the body/handle stretch from
        // just below the speaker down to just above the credits (see
        // ReaderBookletPage). height:100% resolves against that slot.
        height: '100%',
        display: 'flex',
        // row-reverse puts the handle (second in DOM) on the LEFT of the body,
        // so the tab is what peeks inward from the right edge while the body
        // hides beyond it. DOM order stays body-then-handle: the tab is the
        // panel's control, so it should follow the region it discloses in the
        // reading/tab order regardless of which edge we dock to.
        flexDirection: 'row-reverse',
        // Handle and body are both full-height now, so alignment is moot.
        alignItems: 'stretch',
        // Re-enable clicks: the parent wrapper sets pointer-events:none (so its
        // wider, untransformed DOM box can't block the prev/next nav). That
        // none inherits to children, so we must restore auto here. Because this
        // root is translateX-shifted, its hit area follows the visual position
        // — when collapsed only the handle peeks out, so nav stays clickable.
        pointerEvents: 'auto',
      }}
    >
      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div
        ref={contentRef}
        style={{
          height: '100%',
          // Never exceed the viewport-derived cap; the width otherwise hugs the
          // (fixed-width) columns, so few words ⇒ a narrow body.
          maxWidth: maxBodyWidth,
          display: 'flex',
          flexDirection: 'column',
          padding: VOCABULARY_PANEL_PADDING,
          backgroundColor: BRAND.cream,
          boxShadow: sidebarPanelShadow('right'),
        }}
      >
        {/* Header */}
        <div
          style={{
            height: VOCABULARY_PANEL_HEADER_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: BRAND.text,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 16 }}>New Words</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: BRAND.textMuted,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {words.length}
          </span>
        </div>

        {/* Columns — each hugs its widest chip (min colMinWidth) and fills
            top-to-bottom, wrapping into the next column, so full words always
            fit. When the word count needs more rows than one screenful of the
            slot allows (and the width cap is reached), the region scrolls
            VERTICALLY instead of clipping the bottom words (overflowY:auto only
            shows a scrollbar when actually needed). overflowX is a safety net for
            the rare word longer than a column's min width. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: VOCABULARY_PANEL_COLUMN_GAP,
            height: innerHeight,
            overflowY: 'auto',
            overflowX: 'auto',
          }}
        >
          {columns.map((column, columnIndex) => (
            <div
              key={columnIndex}
              style={{
                flexShrink: 0,
                minWidth: colMinWidth,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: VOCABULARY_PANEL_ROW_GAP,
              }}
            >
              {column.map((word) => (
                <VocabChip
                  key={`${word.english.toLowerCase()}|${word.hebrew}`}
                  word={word}
                  chipHeight={chipHeight}
                  fontSize={chipFontSize}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Handle tab — always-visible peeking part ─────────────────────── */}
      <button
        type="button"
        aria-label={expanded ? 'Close vocabulary' : 'Open vocabulary'}
        aria-expanded={expanded}
        onClick={() => {
          // Arm the slide for this one toggle; the layout effect disarms it
          // again on the next page change.
          setSlideEnabled(true);
          setExpanded((v) => !v);
        }}
        style={{
          flexShrink: 0,
          width: VOCABULARY_PANEL_HANDLE_WIDTH,
          height: '100%',
          border: 'none',
          padding: 0,
          backgroundColor: BRAND.cream,
          ...sidebarHandleRadius('right'),
          boxShadow: sidebarPanelShadow('right'),
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: expanded ? BRAND.green : BRAND.textMuted,
          transition: 'color 0.2s',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ display: 'block', transform: 'rotate(90deg)', fontSize: 17, fontWeight: 700, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>Dictionary</span>
      </button>
    </div>
  );
}
