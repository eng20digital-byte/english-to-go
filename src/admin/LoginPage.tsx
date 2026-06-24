import { useState, type FormEvent, type CSSProperties } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { BRAND } from '@/config/theme';

export function LoginPage() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [btnHover, setBtnHover] = useState(false);
  const [btnActive, setBtnActive] = useState(false);

  if (!loading && session) {
    const from =
      (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/admin';
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
    }
  }

  function inputStyle(focused: boolean): CSSProperties {
    return {
      backgroundColor: BRAND.creamLight,
      border: `2px solid ${focused ? BRAND.green : 'transparent'}`,
      borderRadius: 12,
      padding: '12px 16px',
      fontSize: 15,
      outline: 'none',
      boxShadow: focused ? `0 0 0 4px rgba(89,178,146,0.18)` : 'none',
      transition: 'border-color 0.18s, box-shadow 0.18s',
      color: BRAND.text,
      direction: 'ltr',
      width: '100%',
    };
  }

  return (
    <div
      id="admin-root"
      style={{
        minHeight: '100vh',
        backgroundColor: BRAND.green,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
      }}
    >
      {/* ── Background geometric shapes ─────────────────────────────────────
          Oversized flat shapes partially erupting from viewport edges create
          the layered paper-cut aesthetic. No gradients, no glassmorphism. */}

      {/* Large yellow circle — top-left corner */}
      <div style={{
        position: 'absolute', top: -130, left: -150,
        width: 420, height: 420, borderRadius: '50%',
        backgroundColor: BRAND.yellow,
        boxShadow: '10px 14px 0 rgba(0,0,0,0.09)',
        pointerEvents: 'none',
      }} />

      {/* Pink rounded rectangle — bottom-right, angled */}
      <div style={{
        position: 'absolute', bottom: -110, right: -90,
        width: 380, height: 320, borderRadius: 60,
        backgroundColor: BRAND.pink,
        transform: 'rotate(14deg)',
        boxShadow: '-8px -10px 0 rgba(0,0,0,0.08)',
        pointerEvents: 'none',
      }} />

      {/* Cream circle — bottom-left */}
      <div style={{
        position: 'absolute', bottom: -80, left: -90,
        width: 280, height: 280, borderRadius: '50%',
        backgroundColor: BRAND.cream,
        boxShadow: '8px 8px 0 rgba(0,0,0,0.07)',
        pointerEvents: 'none',
      }} />

      {/* Pink tall pill — top-right, partially off-screen */}
      <div style={{
        position: 'absolute', top: -90, right: '8%',
        width: 130, height: 300, borderRadius: 65,
        backgroundColor: BRAND.pink, opacity: 0.65,
        transform: 'rotate(-22deg)',
        pointerEvents: 'none',
      }} />

      {/* Yellow medium circle — mid-right, half off-screen */}
      <div style={{
        position: 'absolute', top: '34%', right: -95,
        width: 220, height: 220, borderRadius: '50%',
        backgroundColor: BRAND.yellow, opacity: 0.6,
        boxShadow: '-6px 6px 0 rgba(0,0,0,0.07)',
        pointerEvents: 'none',
      }} />

      {/* Cream small circle — mid-left, partially off-screen */}
      <div style={{
        position: 'absolute', top: '22%', left: -50,
        width: 140, height: 140, borderRadius: '50%',
        backgroundColor: BRAND.cream, opacity: 0.5,
        pointerEvents: 'none',
      }} />

      {/* ── Card composition ─────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 440, padding: '0 24px',
      }}>
        {/* Decorative dots above the card — reinforce the paper-layer feel */}
        <div style={{
          position: 'absolute', top: -10, right: 40,
          width: 18, height: 18, borderRadius: '50%',
          backgroundColor: BRAND.pink, zIndex: 11,
        }} />
        <div style={{
          position: 'absolute', top: 6, right: 66,
          width: 10, height: 10, borderRadius: '50%',
          backgroundColor: BRAND.yellow, zIndex: 11,
        }} />

        {/* Unified card shadow — wraps both the title tab and form body */}
        <div style={{
          borderRadius: 24,
          boxShadow: '0 28px 72px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.12)',
        }}>

          {/* ── Yellow title tab ── */}
          <div style={{
            backgroundColor: BRAND.yellow,
            borderRadius: '24px 24px 0 0',
            padding: '32px 44px 26px',
          }}>
            <h1 style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 800,
              color: BRAND.text,
              letterSpacing: '-0.3px',
              lineHeight: 1.25,
              direction: 'ltr',
              fontFamily: 'inherit',
            }}>
             BookLet. <br/>
             Let your Book come alive.
            </h1>
            <p style={{
              margin: '6px 0 0',
              fontSize: 11,
              fontWeight: 700,
              color: BRAND.textMuted,
              letterSpacing: '0.7px',
              textTransform: 'uppercase',
            }}>
              Admin Login
            </p>
          </div>

          {/* ── Cream form section ── */}
          <div style={{
            backgroundColor: BRAND.cream,
            borderRadius: '0 0 24px 24px',
            padding: '36px 44px 44px',
          }}>
            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
            >
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: BRAND.text, letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}>
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  style={inputStyle(emailFocused)}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: BRAND.text, letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}>
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  style={inputStyle(passwordFocused)}
                />
              </label>

              {error && (
                <p style={{
                  margin: 0, fontSize: 13, fontWeight: 600,
                  color: BRAND.pink,
                }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                onMouseEnter={() => setBtnHover(true)}
                onMouseLeave={() => { setBtnHover(false); setBtnActive(false); }}
                onMouseDown={() => setBtnActive(true)}
                onMouseUp={() => setBtnActive(false)}
                style={{
                  marginTop: 8,
                  backgroundColor: (btnHover || submitting) ? BRAND.yellowDark : BRAND.yellow,
                  color: BRAND.text,
                  border: 'none',
                  borderRadius: 14,
                  padding: '14px 24px',
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: '0.2px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transform: btnActive && !submitting ? 'scale(0.975)' : 'scale(1)',
                  transition: 'background-color 0.16s, transform 0.1s',
                  boxShadow: '0 4px 0 rgba(0,0,0,0.12)',
                  width: '100%',
                  fontFamily: 'inherit',
                }}
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
