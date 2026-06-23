import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_SPEECH_RATE,
  ENGLISH_SPEECH_LANG,
  HEBREW_CHAR_REGEX,
  HEBREW_SPEECH_LANG,
} from '@/config/tts';

interface WordSpeechContextValue {
  speak: (word: string, wordKey: string) => void;
  speakingWordKey: string | null;
  rate: number;
  setRate: (rate: number) => void;
  voiceWarning: string | null;
}

const WordSpeechContext = createContext<WordSpeechContextValue | undefined>(undefined);

function detectLang(word: string): string {
  return HEBREW_CHAR_REGEX.test(word) ? HEBREW_SPEECH_LANG : ENGLISH_SPEECH_LANG;
}

// Single shared speechSynthesis session for the whole reader page (one
// provider instance per booklet view), so clicking a word in any text box —
// even across different pages' elements — cancels whatever was speaking
// before it. Per-word `lang` rather than a fixed per-booklet language: see
// CLAUDE.md "TTS (word-click)" and config/tts.ts.
export function WordSpeechProvider({ children }: { children: ReactNode }) {
  const [speakingWordKey, setSpeakingWordKey] = useState<string | null>(null);
  const [rate, setRate] = useState(DEFAULT_SPEECH_RATE);
  const speechSupported = typeof window !== 'undefined' && !!window.speechSynthesis;
  const [voiceWarning, setVoiceWarning] = useState<string | null>(
    speechSupported ? null : 'Speech is not supported in this browser.',
  );
  const rateRef = useRef(rate);
  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  useEffect(() => {
    if (!speechSupported) return;

    // Voice lists load asynchronously in most browsers — a check that runs
    // before they're populated would false-negative on a device that does
    // have a Hebrew voice, so this re-checks on `voiceschanged` too.
    function checkVoices() {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;
      const hasHebrewVoice = voices.some((voice) => voice.lang?.toLowerCase().startsWith('he'));
      setVoiceWarning(
        hasHebrewVoice
          ? null
          : 'No Hebrew voice was found on this device — Hebrew words may be silent or read in another language.',
      );
    }

    // Deferred rather than called synchronously in the effect body — the
    // voice list is frequently empty on the first tick anyway (see above),
    // and this keeps the initial check and the `voiceschanged` re-check on
    // the same async code path.
    const initialCheckId = window.setTimeout(checkVoices, 0);
    window.speechSynthesis.addEventListener('voiceschanged', checkVoices);
    return () => {
      window.clearTimeout(initialCheckId);
      window.speechSynthesis.removeEventListener('voiceschanged', checkVoices);
    };
  }, [speechSupported]);

  // Chrome can silently garbage-collect a SpeechSynthesisUtterance that
  // nothing references after speak() returns, which aborts speech with no
  // event at all (https://crbug.com/509488) — utteranceRef keeps the only
  // in-flight utterance alive for its full lifetime, independent of React's
  // render cycle.
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((word: string, wordKey: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // No queueing — a new click always interrupts in-progress speech.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utteranceRef.current = utterance;
    utterance.lang = detectLang(word);
    utterance.rate = rateRef.current;
    utterance.onstart = () => setSpeakingWordKey(wordKey);
    const clearIfCurrent = () => {
      setSpeakingWordKey((current) => (current === wordKey ? null : current));
      if (utteranceRef.current === utterance) utteranceRef.current = null;
    };
    utterance.onend = clearIfCurrent;
    utterance.onerror = (event) => {
      console.error('[useWordSpeech] speechSynthesis error', event.error, {
        word,
        lang: utterance.lang,
      });
      clearIfCurrent();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const value = useMemo(
    () => ({ speak, speakingWordKey, rate, setRate, voiceWarning }),
    [speak, speakingWordKey, rate, voiceWarning],
  );

  return <WordSpeechContext.Provider value={value}>{children}</WordSpeechContext.Provider>;
}

// For callers that are only ever mounted under a WordSpeechProvider (e.g.
// SpeechRateControl in the reader chrome) — throws rather than degrading
// silently, since rendering without a provider there is a wiring bug, not a
// runtime state.
// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with its provider, same convention as AuthContext.tsx
export function useWordSpeech(): WordSpeechContextValue {
  const context = useContext(WordSpeechContext);
  if (!context) {
    throw new Error('useWordSpeech must be used within a WordSpeechProvider');
  }
  return context;
}

// TextElement is the one consumer mounted in *both* modes (shared renderer
// — see CLAUDE.md "Shared renderer — never fork this"): reader mode mounts
// under WordSpeechProvider, editor mode never does. Returns null instead of
// throwing so the same component tree works in both without a renderMode
// branch around the hook call itself (which would violate rules-of-hooks).
// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with its provider, same convention as AuthContext.tsx
export function useWordSpeechOptional(): WordSpeechContextValue | null {
  return useContext(WordSpeechContext) ?? null;
}
