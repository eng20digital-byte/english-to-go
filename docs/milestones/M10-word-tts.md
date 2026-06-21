# M10 — Word-Click TTS

## Goal
In the public reader, clicking any word speaks it aloud via the browser's Web Speech API, with a rate control and visual "currently speaking" feedback.

## Scope
- `src/config/tts.ts` — default speech rate, min/max rate bounds.
- `src/tts/useWordSpeech.ts` — wraps `window.speechSynthesis`. `speak(word)` creates a single-word `SpeechSynthesisUtterance` (`lang: 'he-IL'` or detected per-word language if mixed content — confirm approach during implementation), calls `speechSynthesis.cancel()` before each new `speak()` call (no queueing, per the locked-in interrupt behavior), tracks the currently-speaking word's identity for highlight state, exposes `rate` get/set.
- `src/tts/SpeechRateControl.tsx` — slider/control bound to `rate`.
- Wire word spans in `TextElement` (reader mode only, per the renderMode split from M4) to `useWordSpeech`'s `speak`.
- Visual feedback: a CSS class applied to the currently-speaking word's span, removed on utterance end.
- Graceful handling when no Hebrew voice is available (e.g. a non-blocking inline note, not a crash) — this is the flagged external risk from the plan.

## Out of scope
No TTS in the editor (reader-only, intentionally — see M4's renderMode rule).

## Manual verification
1. Click several Hebrew words in sequence — each is read aloud, the previous one's speech is cut off immediately when a new word is clicked (no overlap/queueing).
2. Click an English word inside mixed-language text — read with reasonable pronunciation (language detection working).
3. Adjust the rate slider — confirm subsequent clicks speak at the new rate.
4. Confirm the clicked word visually highlights for the duration of its speech and un-highlights when done.
5. Test in at least two different browsers (e.g. Chrome + one other) to observe Hebrew voice availability differences firsthand.
