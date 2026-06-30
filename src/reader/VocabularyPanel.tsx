import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { BRAND } from '@/config/theme';
import { TTS_ACTIVE_WORD_STYLE } from '@/config/tts';
import {
  DEFAULT_VOCABULARY_BUBBLE_BACKGROUND,
  DEFAULT_VOCABULARY_BUBBLE_BORDER_COLOR,
  VOCABULARY_PANEL_CHIP_FONT_SIZE,
  VOCABULARY_PANEL_CHIP_HEIGHT,
  VOCABULARY_PANEL_COLUMN_GAP,
  VOCABULARY_PANEL_HANDLE_HEIGHT,
  VOCABULARY_PANEL_HANDLE_WIDTH,
  VOCABULARY_PANEL_HEADER_HEIGHT,
  VOCABULARY_PANEL_HEIGHT,
  VOCABULARY_PANEL_PADDING,
  VOCABULARY_PANEL_ROW_GAP,
  VOCABULARY_PANEL_SLIDE_MS,
  VOCABULARY_WORD_SEPARATOR,
} from '@/config/vocabulary';
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

function VocabChip({ word }: { word: VocabularyWord }) {
  const { speak, speakingWordKey } = useWordSpeech();
  const wordKey = `vocab-panel:${word.english.toLowerCase()}|${word.hebrew}`;
  const isSpeaking = speakingWordKey === wordKey;

  return (
    <div
      style={{
        height: VOCABULARY_PANEL_CHIP_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
        backgroundColor: DEFAULT_VOCABULARY_BUBBLE_BACKGROUND,
        border: `1px solid ${DEFAULT_VOCABULARY_BUBBLE_BORDER_COLOR}`,
        borderRadius: 999,
        fontSize: VOCABULARY_PANEL_CHIP_FONT_SIZE,
        color: BRAND.text,
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
      <span aria-hidden style={{ color: BRAND.textMuted }}>{VOCABULARY_WORD_SEPARATOR}</span>
      <span dir="rtl">{word.hebrew}</span>
    </div>
  );
}

// Page-aware vocabulary list, always reachable while reading. Shows only the
// words on the page currently in view and updates automatically when the
// reader flips pages (the parent passes the current page, which changes on
// flip). Mirrors the speech-rate control's interaction: a rounded tab peeks
// from the left edge and the body slides in/out. Collapsed by default. Lives
// in reader chrome (#reader-root), so inline-styled utilities are fine here —
// never touches PageCanvas or the element renderers.
export function VocabularyPanel({ page }: { page: ReaderBookletPage | undefined }) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  // Measured body width drives the collapse distance, so the slide always
  // matches the panel's actual (column-count-dependent) width.
  const [contentWidth, setContentWidth] = useState(0);
  // The slide transition must fire ONLY for a user-initiated expand/collapse —
  // never as a side effect of a page change. On flip, the panel's measured
  // width (and thus its collapsed offset `translateX(-contentWidth)`) can
  // change, which would otherwise animate the panel into place on every page
  // turn (the distracting "entry animation"). So the transition is off by
  // default, armed for exactly one toggle by the handle's onClick, and disarmed
  // again whenever the page's words change (the layout effect below).
  const [slideEnabled, setSlideEnabled] = useState(false);

  const words = useMemo(() => collectPageVocabulary(page), [page]);

  // Fixed inner height -> deterministic rows-per-column -> column split.
  const innerHeight =
    VOCABULARY_PANEL_HEIGHT -
    VOCABULARY_PANEL_PADDING * 2 -
    VOCABULARY_PANEL_HEADER_HEIGHT -
    VOCABULARY_PANEL_ROW_GAP;
  const rowsPerColumn = Math.max(
    1,
    Math.floor(
      (innerHeight + VOCABULARY_PANEL_ROW_GAP) /
        (VOCABULARY_PANEL_CHIP_HEIGHT + VOCABULARY_PANEL_ROW_GAP),
    ),
  );
  const columns = useMemo(() => splitIntoColumns(words, rowsPerColumn), [words, rowsPerColumn]);

  // useLayoutEffect (pre-paint) so the initial collapsed offset is correct on
  // first paint — no flash of the open panel. Re-measures when the column
  // layout changes (e.g. book data updates add/remove words).
  useLayoutEffect(() => {
    // A new page's words changed the column layout — disarm the slide so the
    // re-measured collapsed offset applies instantly (no entry animation on
    // page change), then re-measure.
    setSlideEnabled(false);
    if (contentRef.current) setContentWidth(contentRef.current.offsetWidth);
  }, [columns]);

  if (words.length === 0) return null;

  return (
    <div
      translate="no"
      style={{
        // Positioning is handled by the parent sidebar container in
        // ReaderBookletPage — this component is a plain flex-row child.
        // translateX hides the body, leaving only the handle tab visible
        // when collapsed; the parent centers the whole sidebar vertically.
        transform: `translateX(${expanded ? 0 : -contentWidth}px)`,
        transition: slideEnabled
          ? `transform ${VOCABULARY_PANEL_SLIDE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
          : 'none',
        display: 'flex',
        // Center the shorter handle tab against the taller body.
        alignItems: 'center',
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
          height: VOCABULARY_PANEL_HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          padding: VOCABULARY_PANEL_PADDING,
          backgroundColor: BRAND.cream,
          boxShadow: '2px 4px 18px rgba(0,0,0,0.22)',
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

        {/* Columns — fixed height, fill top-to-bottom then wrap, never scrolls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: VOCABULARY_PANEL_COLUMN_GAP,
            height: innerHeight,
          }}
        >
          {columns.map((column, columnIndex) => (
            <div
              key={columnIndex}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: VOCABULARY_PANEL_ROW_GAP,
              }}
            >
              {column.map((word) => (
                <VocabChip key={`${word.english.toLowerCase()}|${word.hebrew}`} word={word} />
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
          height: VOCABULARY_PANEL_HANDLE_HEIGHT,
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
        <span style={{ display: 'block', transform: 'rotate(90deg)', fontSize: 17, fontWeight: 700, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>Dictionary</span>
      </button>
    </div>
  );
}
