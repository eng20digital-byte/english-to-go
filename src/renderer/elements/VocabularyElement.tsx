import { useFontsQuery } from '@/hooks/useFontsQuery';
import { useFontFace } from '@/hooks/useFontFace';
import { VOCABULARY_WORD_SEPARATOR } from '@/config/vocabulary';
import { TTS_ACTIVE_WORD_STYLE } from '@/config/tts';
import { useWordSpeechOptional } from '@/tts/useWordSpeech';
import type { PageElement } from '@/types/elements';
import type { ElementRendererProps } from './registry';

type Props = ElementRendererProps<Extract<PageElement, { type: 'vocabulary' }>>;

// Renders the whole vocabulary list as ONE element (per the data model: a
// single page element holding a `words` array, not one element per word).
// Each pair is an individual rounded chip `[ english - hebrew ]`; the
// container flex-wraps so chips flow to the next line on their own. Each chip
// is inline-flex and sizes to its content + padding. English and Hebrew use
// their own configured fonts (same font_id / useFontFace mechanism as
// TextElement). Lives in the shared renderer, so editor and reader render it
// identically — no vocabulary logic in TextElement (CLAUDE.md rule #1).
//
// TTS: like TextElement, the individual words are click-to-speak in `reader`
// mode only (editor keeps the whole chip box as the drag/select target). Both
// the English and Hebrew word are clickable; `speak()` auto-detects the voice
// per word (Hebrew letters -> he-IL, else en-US — see config/tts.ts), so no
// per-language wiring is needed here.
export function VocabularyElement({ element, renderMode }: Props) {
  const {
    words,
    show_on_page,
    english_font_id,
    hebrew_font_id,
    font_size,
    text_color,
    bubble_background_color,
    bubble_border_color,
    bubble_border_width,
    bubble_border_radius,
    bubble_padding_x,
    bubble_padding_y,
    bubble_spacing,
  } = element.props;

  // Missing => visible (elements predate the toggle). When hidden, the reader
  // shows nothing on the page (the words still feed VocabularyPanel); the
  // editor keeps rendering — dimmed — so the admin can still select/move/edit
  // it and sees that it won't appear publicly. This is "behavior intrinsic to
  // rendering" toggled by renderMode, the only thing renderMode is for.
  const hiddenOnPage = show_on_page === false;

  const { data: fonts } = useFontsQuery();

  const englishFont = fonts?.find((f) => f.id === english_font_id);
  const hebrewFont = fonts?.find((f) => f.id === hebrew_font_id);
  const englishFamily = `font-${english_font_id}`;
  const hebrewFamily = `font-${hebrew_font_id}`;
  const englishStatus = useFontFace(englishFont?.storage_path, englishFamily);
  const hebrewStatus = useFontFace(hebrewFont?.storage_path, hebrewFamily);

  // Called unconditionally (rules-of-hooks) — null in editor mode, where no
  // WordSpeechProvider is mounted (provider wraps the reader chrome only).
  const wordSpeechContext = useWordSpeechOptional();
  const wordSpeech = renderMode === 'reader' ? wordSpeechContext : null;

  // Renders one word span, click-active for TTS in reader mode only.
  function renderWord(text: string, wordKey: string, familyLoaded: boolean, family: string) {
    const fontFamily = familyLoaded ? family : undefined;
    if (!wordSpeech) {
      return <span style={{ fontFamily }}>{text}</span>;
    }
    const isSpeaking = wordSpeech.speakingWordKey === wordKey;
    return (
      <span
        onClick={() => wordSpeech.speak(text, wordKey)}
        style={{
          fontFamily,
          cursor: 'pointer',
          ...(isSpeaking ? TTS_ACTIVE_WORD_STYLE : null),
        }}
      >
        {text}
      </span>
    );
  }

  // Hidden + reader: render nothing on the page. Done after all hooks so the
  // hook order stays stable (rules-of-hooks) regardless of visibility.
  if (hiddenOnPage && renderMode === 'reader') return null;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexWrap: 'wrap',
        alignContent: 'flex-start',
        gap: bubble_spacing,
        fontSize: font_size,
        color: text_color,
        // Editor-only: dim a hidden element so the admin sees it won't appear
        // in the reader, while still being able to select/move/edit it.
        opacity: hiddenOnPage ? 0.4 : undefined,
      }}
    >
      {words.map((word, index) => (
        <span
          key={index}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4em',
            backgroundColor: bubble_background_color,
            border: `${bubble_border_width}px solid ${bubble_border_color}`,
            borderRadius: bubble_border_radius,
            padding: `${bubble_padding_y}px ${bubble_padding_x}px`,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
          }}
        >
          <span dir="ltr">
            {renderWord(word.english, `${element.id}:${index}:en`, englishStatus === 'loaded', englishFamily)}
          </span>
          <span aria-hidden>{VOCABULARY_WORD_SEPARATOR}</span>
          <span dir="rtl">
            {renderWord(word.hebrew, `${element.id}:${index}:he`, hebrewStatus === 'loaded', hebrewFamily)}
          </span>
        </span>
      ))}
    </div>
  );
}
