import { Slider } from '@/components/ui/slider';
import { MAX_SPEECH_RATE, MIN_SPEECH_RATE, SPEECH_RATE_STEP } from '@/config/tts';
import { BRAND } from '@/config/theme';
import { useWordSpeech } from './useWordSpeech';

interface SpeechRateControlProps {
  // compact=true: smaller emojis, shorter slider, no voice warning — used when
  // the control is an overlay pill directly on the booklet card.
  compact?: boolean;
}

// Reader chrome (under #reader-root — see CLAUDE.md "UI component library —
// scope boundary"), so Tailwind utilities and shadcn Slider are safe here.
// No own background: the parent card or overlay pill provides the surface.
export function SpeechRateControl({ compact = false }: SpeechRateControlProps) {
  const { rate, setRate, voiceWarning } = useWordSpeech();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 5 : 8 }}>
      <span aria-hidden="true" style={{ fontSize: compact ? 12 : 15, lineHeight: 1, userSelect: 'none', flexShrink: 0 }}>🐢</span>
      <Slider
        aria-label="Speech rate"
        min={MIN_SPEECH_RATE}
        max={MAX_SPEECH_RATE}
        step={SPEECH_RATE_STEP}
        value={[rate]}
        onValueChange={([value]) => setRate(value)}
        className={compact ? 'w-20' : 'w-28'}
      />
      <span aria-hidden="true" style={{ fontSize: compact ? 12 : 15, lineHeight: 1, userSelect: 'none', flexShrink: 0 }}>🐇</span>
      <span style={{
        minWidth: compact ? '1.8rem' : '2.4rem',
        textAlign: 'center',
        fontSize: compact ? 11 : 12,
        fontWeight: 700,
        color: BRAND.text,
        fontVariantNumeric: 'tabular-nums',
        flexShrink: 0,
      }}>
        {rate.toFixed(1)}×
      </span>
      {/* Voice warning suppressed in compact mode — show it full-size only
          when the control has its own layout space (non-overlay usage). */}
      {!compact && voiceWarning && (
        <span style={{ fontSize: 11, fontWeight: 500, color: '#c05a00', whiteSpace: 'nowrap', flexShrink: 0 }}>
          ⚠ {voiceWarning}
        </span>
      )}
    </div>
  );
}
