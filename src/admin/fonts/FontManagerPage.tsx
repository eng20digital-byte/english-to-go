import { useState, type CSSProperties } from 'react';
import { Type } from 'lucide-react';
import { Spinner } from '@/components/Spinner';
import { FONT_WEIGHTS, type FontWeight } from '@/config/fonts';
import { useFontsQuery, useRegisterFontMutation } from '@/hooks/useFontsQuery';
import { BRAND } from '@/config/theme';
import { AdminPageShell } from '@/admin/shell/AdminPageShell';
import { AdminPageHeader } from '@/admin/shell/AdminPageHeader';
import { EmptyState } from '@/admin/shell/EmptyState';
import { CARD_COLORS, inputStyle, submitButtonStyle } from '@/admin/shell/adminControls';
import { FontPreview } from './FontPreview';

const labelTextStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: BRAND.text,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
};

export function FontManagerPage() {
  const { data: fonts, isLoading } = useFontsQuery();
  const registerFont = useRegisterFontMutation();

  const [name, setName] = useState('');
  const [weight, setWeight] = useState<FontWeight>('regular');
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Hover / focus states — styling only, no logic
  const [nameFocused, setNameFocused] = useState(false);
  const [weightFocused, setWeightFocused] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [submitHover, setSubmitHover] = useState(false);
  const [submitActive, setSubmitActive] = useState(false);

  async function handleSubmit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    if (!file) {
      setFormError('Choose a .woff2 file to upload.');
      return;
    }
    setFormError(null);

    // Captured synchronously — React nulls out event.currentTarget once the
    // event has finished dispatching, which has already happened by the
    // time the await below resolves.
    const form = event.currentTarget;

    try {
      await registerFont.mutateAsync({ name, weight, file });
      form.reset();
      setName('');
      setWeight('regular');
      setFile(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to register font.');
    }
  }

  return (
    <AdminPageShell variant="fonts">
        <AdminPageHeader
          accent="green"
          icon={<Type size={24} color="#fff" />}
          title="Font Library"
          subtitle="Register custom WOFF2 typefaces to use in booklet text elements."
        />

        {/* ── Upload form — cream paper card ── */}
        <div style={{
          backgroundColor: BRAND.cream,
          borderRadius: 24,
          padding: '32px 36px 36px',
          marginBottom: 36,
          boxShadow: '0 8px 28px rgba(0,0,0,0.13), 0 2px 6px rgba(0,0,0,0.08)',
        }}>
          <p style={{
            margin: '0 0 24px',
            fontSize: 11,
            fontWeight: 700,
            color: BRAND.textMuted,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
          }}>
            Register a font
          </p>

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
          >
            {/* Row 1: Name + Weight side by side */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: 16,
              marginBottom: 16,
            }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={labelTextStyle}>Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Andika New Basic"
                  required
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  style={inputStyle(nameFocused)}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={labelTextStyle}>Weight</span>
                <select
                  value={weight}
                  onChange={(event) => setWeight(event.target.value as FontWeight)}
                  onFocus={() => setWeightFocused(true)}
                  onBlur={() => setWeightFocused(false)}
                  style={{ ...inputStyle(weightFocused), cursor: 'pointer' }}
                >
                  {FONT_WEIGHTS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Row 2: WOFF2 file — full width */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              <span style={labelTextStyle}>WOFF2 file</span>
              <div style={{
                backgroundColor: BRAND.creamLight,
                borderRadius: 12,
                border: `2px solid transparent`,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <input
                  type="file"
                  accept=".woff2"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  required
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: BRAND.text,
                    cursor: 'pointer',
                    border: 'none',
                    outline: 'none',
                    background: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              {file && (
                <span style={{ fontSize: 12, color: BRAND.green, fontWeight: 600 }}>
                  ✓ {file.name}
                </span>
              )}
            </label>

            {formError && (
              <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: BRAND.pink }}>
                {formError}
              </p>
            )}

            {/* Submit */}
            <div>
              <button
                type="submit"
                disabled={registerFont.isPending}
                onMouseEnter={() => setSubmitHover(true)}
                onMouseLeave={() => { setSubmitHover(false); setSubmitActive(false); }}
                onMouseDown={() => setSubmitActive(true)}
                onMouseUp={() => setSubmitActive(false)}
                style={submitButtonStyle(
                  { hover: submitHover, active: submitActive, pending: registerFont.isPending },
                  {
                    padding: '12px 28px',
                    fontSize: 14,
                    boxShadow: '0 4px 0 rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  },
                )}
              >
                {registerFont.isPending ? (
                  <>
                    <Spinner size="sm" />
                    Uploading…
                  </>
                ) : (
                  'Register font'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ── Section label ── */}
        <p style={{
          margin: '0 0 20px',
          fontSize: 11,
          fontWeight: 700,
          color: BRAND.yellow,
          letterSpacing: '0.7px',
          textTransform: 'uppercase',
        }}>
          Registered fonts
        </p>

        {/* Loading state */}
        {isLoading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '24px 0',
            color: BRAND.cream,
            fontSize: 14,
            fontWeight: 500,
          }}>
            <Spinner size="sm" />
            <span>Loading fonts…</span>
          </div>
        )}

        {!isLoading && fonts?.length === 0 && (
          <EmptyState
            accent="green"
            icon={<Type size={24} color={BRAND.green} />}
            title="No fonts registered yet"
            subtitle="Upload a .woff2 file using the form above."
          />
        )}

        {/* ── Font gallery — typography specimens as full-width colored rows ── */}
        <ul style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}>
          {fonts?.map((font, index) => {
            const hovered = hoveredId === font.id;
            const palette = CARD_COLORS[index % CARD_COLORS.length];

            return (
              <li
                key={font.id}
                onMouseEnter={() => setHoveredId(font.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  backgroundColor: palette.bg,
                  borderRadius: 18,
                  padding: '18px 28px',
                  boxShadow: hovered
                    ? '0 14px 34px rgba(0,0,0,0.18), 0 5px 14px rgba(0,0,0,0.1)'
                    : '0 6px 18px rgba(0,0,0,0.12), 0 2px 5px rgba(0,0,0,0.07)',
                  transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  // Color inheritance — FontPreview's <p> picks up the row's text color
                  color: palette.text,
                }}
              >
                {/* Font name + weight badge — fixed-width left column */}
                <div style={{
                  flexShrink: 0,
                  width: 220,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 7,
                  borderRight: `1px solid ${palette.text === '#fff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)'}`,
                  paddingRight: 20,
                }}>
                  <span style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: palette.text,
                    letterSpacing: '-0.2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {font.name}
                  </span>
                  <span style={{
                    alignSelf: 'flex-start',
                    display: 'inline-block',
                    padding: '4px 11px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.3px',
                    textTransform: 'capitalize',
                    backgroundColor: palette.badgeBg,
                    color: palette.badgeText,
                  }}>
                    {font.weight}
                  </span>
                </div>

                {/* Font preview — fills the rest of the row */}
                <div style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <FontPreview font={font} />
                </div>
              </li>
            );
          })}
        </ul>
    </AdminPageShell>
  );
}
