import { MAX_SPEECH_RATE, MIN_SPEECH_RATE, SPEECH_RATE_STEP } from '@/config/tts';
import { useWordSpeech } from './useWordSpeech';

// Reader chrome (under #reader-root — see CLAUDE.md "UI component library —
// scope boundary"), so Tailwind utilities are safe here.
export function SpeechRateControl() {
  const { rate, setRate, voiceWarning } = useWordSpeech();

  return (
    <div className="flex w-full max-w-[640px] flex-col items-center gap-1">
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <span aria-hidden="true">🐢</span>
        <input
          type="range"
          aria-label="Speech rate"
          min={MIN_SPEECH_RATE}
          max={MAX_SPEECH_RATE}
          step={SPEECH_RATE_STEP}
          value={rate}
          onChange={(event) => setRate(Number(event.target.value))}
          className="h-1 w-32 accent-neutral-500"
        />
        <span aria-hidden="true">🐇</span>
        <span className="min-w-[2.5rem] text-center tabular-nums">{rate.toFixed(1)}×</span>
      </div>
      {voiceWarning && <p className="text-center text-xs text-amber-600">{voiceWarning}</p>}
    </div>
  );
}
