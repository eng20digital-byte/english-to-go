import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Type } from 'lucide-react';
import { Spinner } from '@/components/Spinner';
import { FONT_WEIGHTS, type FontWeight } from '@/config/fonts';
import { useFontsQuery, useRegisterFontMutation } from '@/hooks/useFontsQuery';
import { BRAND } from '@/config/theme';
import { FontPreview } from './FontPreview';

// Cycles across font cards — cream → yellow → pink → repeat
const CARD_COLORS = [
  {
    bg: BRAND.cream,
    text: BRAND.text,
    textMuted: BRAND.textMuted,
    badgeBg: BRAND.green,
    badgeText: '#fff',
  },
  {
    bg: BRAND.yellow,
    text: BRAND.text,
    textMuted: 'rgba(26,26,26,0.6)',
    badgeBg: 'rgba(0,0,0,0.10)',
    badgeText: BRAND.text,
  },
  {
    bg: BRAND.pink,
    text: '#fff',
    textMuted: 'rgba(255,255,255,0.72)',
    badgeBg: 'rgba(255,255,255,0.22)',
    badgeText: '#fff',
  },
] as const;

function inputStyle(focused: boolean): CSSProperties {
  return {
    backgroundColor: BRAND.creamLight,
    border: `2px solid ${focused ? BRAND.green : 'transparent'}`,
    borderRadius: 12,
    padding: '11px 14px',
    fontSize: 14,
    outline: 'none',
    boxShadow: focused ? `0 0 0 4px rgba(89,178,146,0.18)` : 'none',
    transition: 'border-color 0.18s, box-shadow 0.18s',
    color: BRAND.text,
    width: '100%',
    fontFamily: 'inherit',
  };
}

const labelTextStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: BRAND.text,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
};

function EmptyFonts() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      padding: '60px 24px',
      backgroundColor: BRAND.cream,
      borderRadius: 24,
      border: '2px dashed rgba(89,178,146,0.4)',
      textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        backgroundColor: 'rgba(89,178,146,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Type size={24} color={BRAND.green} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: BRAND.text }}>
          No fonts registered yet
        </p>
        <p style={{ margin: '5px 0 0', fontSize: 14, color: BRAND.textMuted }}>
          Upload a .woff2 file using the form above.
        </p>
      </div>
    </div>
  );
}

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
  const [backLinkHover, setBackLinkHover] = useState(false);

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
    <div
      id="admin-root"
      style={{
        minHeight: '100vh',
        backgroundColor: BRAND.green,
        position: 'relative',
        overflow: 'hidden',
        padding: '28px 32px 64px',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
      }}
    >
      {/* ── Background geometric shapes (same language as login / dashboard / media) ── */}

      {/* Large yellow circle — top-right corner */}
      <div style={{
        position: 'absolute', top: -120, right: -140,
        width: 400, height: 400, borderRadius: '50%',
        backgroundColor: BRAND.yellow,
        boxShadow: '-10px 12px 0 rgba(0,0,0,0.09)',
        pointerEvents: 'none',
      }} />

      {/* Pink rounded rectangle — bottom-right, angled */}
      <div style={{
        position: 'absolute', bottom: -90, right: -80,
        width: 340, height: 290, borderRadius: 55,
        backgroundColor: BRAND.pink,
        transform: 'rotate(12deg)',
        boxShadow: '-8px -8px 0 rgba(0,0,0,0.08)',
        pointerEvents: 'none',
      }} />

      {/* Cream circle — bottom-left */}
      <div style={{
        position: 'absolute', bottom: -60, left: -80,
        width: 260, height: 260, borderRadius: '50%',
        backgroundColor: BRAND.cream, opacity: 0.55,
        boxShadow: '8px 6px 0 rgba(0,0,0,0.06)',
        pointerEvents: 'none',
      }} />

      {/* Pink tall pill — top-left, partially off-screen */}
      <div style={{
        position: 'absolute', top: -80, left: '10%',
        width: 120, height: 280, borderRadius: 60,
        backgroundColor: BRAND.pink, opacity: 0.6,
        transform: 'rotate(22deg)',
        pointerEvents: 'none',
      }} />

      {/* Yellow medium circle — mid-left, half off-screen */}
      <div style={{
        position: 'absolute', top: '38%', left: -80,
        width: 200, height: 200, borderRadius: '50%',
        backgroundColor: BRAND.yellow, opacity: 0.5,
        boxShadow: '6px 6px 0 rgba(0,0,0,0.07)',
        pointerEvents: 'none',
      }} />

      {/* Cream small circle — mid-right */}
      <div style={{
        position: 'absolute', top: '55%', right: -40,
        width: 130, height: 130, borderRadius: '50%',
        backgroundColor: BRAND.cream, opacity: 0.38,
        pointerEvents: 'none',
      }} />

      {/* ── Page content ── */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 900, margin: '0 auto' }}>

        {/* ── Floating header card — matches Media Library header exactly ── */}
        <header style={{
          backgroundColor: BRAND.cream,
          borderRadius: 20,
          padding: '24px 32px 28px',
          marginBottom: 28,
          boxShadow: '0 8px 28px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)',
        }}>
          <Link
            to="/admin"
            onMouseEnter={() => setBackLinkHover(true)}
            onMouseLeave={() => setBackLinkHover(false)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 13,
              fontWeight: 600,
              color: backLinkHover ? BRAND.text : BRAND.textMuted,
              textDecoration: 'none',
              marginBottom: 18,
              transition: 'color 0.15s',
            }}
          >
            ← Back to dashboard
          </Link>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 800,
                color: BRAND.text,
                letterSpacing: '-0.4px',
                fontFamily: 'inherit',
              }}>
                Font Library
              </h1>
              <p style={{
                margin: '7px 0 0',
                fontSize: 14,
                color: BRAND.textMuted,
                fontWeight: 500,
                lineHeight: 1.5,
              }}>
                Register custom WOFF2 typefaces to use in booklet text elements.
              </p>
            </div>
            {/* Icon badge — matches Media Library */}
            <div style={{
              width: 52, height: 52,
              borderRadius: 16,
              backgroundColor: BRAND.green,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              marginLeft: 20,
              boxShadow: '4px 4px 0 rgba(0,0,0,0.1)',
            }}>
              <Type size={24} color="#fff" />
            </div>
          </div>
        </header>

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
                style={{
                  backgroundColor: (submitHover || registerFont.isPending) ? BRAND.yellowDark : BRAND.yellow,
                  color: BRAND.text,
                  border: 'none',
                  borderRadius: 14,
                  padding: '12px 28px',
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.2px',
                  cursor: registerFont.isPending ? 'not-allowed' : 'pointer',
                  transform: submitActive && !registerFont.isPending ? 'scale(0.975)' : 'scale(1)',
                  transition: 'background-color 0.16s, transform 0.1s',
                  boxShadow: '0 4px 0 rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: 'inherit',
                }}
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

        {!isLoading && fonts?.length === 0 && <EmptyFonts />}

        {/* ── Font gallery — typography specimens as colored paper cards ── */}
        <ul style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
          gap: 20,
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
                  borderRadius: 24,
                  padding: '28px 28px 24px',
                  boxShadow: hovered
                    ? '0 20px 50px rgba(0,0,0,0.2), 0 8px 20px rgba(0,0,0,0.12)'
                    : '0 8px 24px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)',
                  transform: hovered ? 'translateY(-6px) scale(1.02)' : 'translateY(0) scale(1)',
                  transition: 'transform 0.22s ease, box-shadow 0.22s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                  // Color inheritance — FontPreview's <p> picks up the card's text color
                  color: palette.text,
                }}
              >
                {/* Font preview — the central visual feature of the card */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 100,
                }}>
                  <FontPreview font={font} />
                </div>

                {/* Font metadata */}
                <div style={{
                  borderTop: `1px solid ${palette.text === '#fff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)'}`,
                  paddingTop: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
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
                    flexShrink: 0,
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
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
