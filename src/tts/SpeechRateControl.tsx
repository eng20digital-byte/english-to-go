import { Slider } from '@/components/ui/slider';
import { MAX_SPEECH_RATE, MIN_SPEECH_RATE, SPEECH_RATE_STEP } from '@/config/tts';
import { useWordSpeech } from './useWordSpeech';

// Reader chrome (under #reader-root — see CLAUDE.md "UI component library —
// scope boundary"), so Tailwind utilities and shadcn Slider are safe here.
export function SpeechRateControl() {
  const { rate, setRate, voiceWarning } = useWordSpeech();

  return (
    <div className="flex w-full max-w-[640px] flex-col items-center gap-1.5">
      <div
        className="flex items-center gap-3 rounded-full border border-white/60 bg-white/90 px-5 py-2.5 backdrop-blur-sm"
        style={{ boxShadow: 'var(--shadow-raised)' }}
      >
        <span aria-hidden="true" className="text-base leading-none select-none">🐢</span>
        <Slider
          aria-label="Speech rate"
          min={MIN_SPEECH_RATE}
          max={MAX_SPEECH_RATE}
          step={SPEECH_RATE_STEP}
          value={[rate]}
          onValueChange={([value]) => setRate(value)}
          className="w-28"
        />
        <span aria-hidden="true" className="text-base leading-none select-none">🐇</span>
        <span className="min-w-[2.5rem] text-center text-xs font-semibold tabular-nums text-neutral-600">
          {rate.toFixed(1)}×
        </span>
      </div>
      {voiceWarning && (
        <p className="text-center text-xs font-medium text-amber-600">{voiceWarning}</p>
      )}
    </div>
  );
}
