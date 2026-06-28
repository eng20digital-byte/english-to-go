// Word-click TTS constants (M10) — see CLAUDE.md "TTS (word-click)".

export const DEFAULT_SPEECH_RATE = 0.9;
export const MIN_SPEECH_RATE = 0.3;
export const MAX_SPEECH_RATE = 1.7;
export const SPEECH_RATE_STEP = 0.1;

// Content is mixed-language in practice (English vocabulary inside
// Hebrew-UI booklets — see CLAUDE.md "Reader navigation convention"), so
// `lang` is picked per word rather than fixed per element: any word
// containing a Hebrew letter is read with the Hebrew voice, everything else
// with the English voice.
export const HEBREW_CHAR_REGEX = /[֐-׿]/;
export const HEBREW_SPEECH_LANG = 'he-IL';
export const ENGLISH_SPEECH_LANG = 'en-US';

// Inline style applied to the currently-speaking word's span in TextElement
// (src/renderer/ never uses Tailwind/CSS classes — see CLAUDE.md "UI
// component library — scope boundary").
export const TTS_ACTIVE_WORD_STYLE: { backgroundColor: string; borderRadius: number } = {
  backgroundColor: 'rgba(250, 204, 21, 0.45)',
  borderRadius: 3,
};
