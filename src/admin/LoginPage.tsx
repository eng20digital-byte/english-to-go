import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { BRAND } from '@/config/theme';
import { CreditsPanel } from '@/reader/CreditsPanel';
import { AdminPageShell } from '@/admin/shell/AdminPageShell';
import { inputStyle, submitButtonStyle } from '@/admin/shell/adminControls';

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

  // Login's inputs are a touch larger than the library forms and force ltr.
  const loginInput = (focused: boolean) =>
    inputStyle(focused, { padding: '12px 16px', fontSize: 15, direction: 'ltr' });

  return (
    <AdminPageShell variant="login" center footer={<CreditsPanel />}>
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
                  style={loginInput(emailFocused)}
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
                  style={loginInput(passwordFocused)}
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
                style={submitButtonStyle(
                  { hover: btnHover, active: btnActive, pending: submitting },
                  {
                    marginTop: 8,
                    padding: '14px 24px',
                    fontSize: 15,
                    boxShadow: '0 4px 0 rgba(0,0,0,0.12)',
                    width: '100%',
                  },
                )}
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </AdminPageShell>
  );
}
