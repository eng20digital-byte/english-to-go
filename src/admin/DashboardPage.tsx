import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ImageIcon, Type, LogOut } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { BRAND } from '@/config/theme';

function cardShadow(hovered: boolean) {
  return hovered
    ? '0 20px 50px rgba(0,0,0,0.2), 0 8px 20px rgba(0,0,0,0.12)'
    : '0 8px 24px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)';
}

// Admin nav hub — booklets/fonts/media each get their own page rather than
// living here, so this stays a thin index rather than growing into a
// catch-all.
export function DashboardPage() {
  const { user } = useAuth();
  const [bookletsHover, setBookletsHover] = useState(false);
  const [fontsHover, setFontsHover] = useState(false);
  const [mediaHover, setMediaHover] = useState(false);
  const [logoutHover, setLogoutHover] = useState(false);

  return (
    <div
      id="admin-root"
      style={{
        // Fixed viewport height + overflow:hidden keeps the dashboard a single
        // non-scrolling hub screen (minHeight would let the box grow past the
        // viewport and re-introduce page scroll).
        height: '100vh',
        backgroundColor: BRAND.green,
        position: 'relative',
        overflow: 'hidden',
        padding: '28px 32px 64px',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
      }}
    >
      {/* ── Background geometric shapes ────────────────────────────────────────
          Same visual language as the login page — flat paper-cut shapes
          erupting from viewport edges. No gradients, no glassmorphism. */}

      {/* Large yellow circle — top-right corner */}
      <div style={{
        position: 'absolute', top: -100, right: -120,
        width: 380, height: 380, borderRadius: '50%',
        backgroundColor: BRAND.yellow,
        boxShadow: '-10px 12px 0 rgba(0,0,0,0.09)',
        pointerEvents: 'none',
      }} />

      {/* Pink rounded rectangle — bottom-left, angled */}
      <div style={{
        position: 'absolute', bottom: -90, left: -80,
        width: 340, height: 290, borderRadius: 55,
        backgroundColor: BRAND.pink,
        transform: 'rotate(-12deg)',
        boxShadow: '8px -8px 0 rgba(0,0,0,0.08)',
        pointerEvents: 'none',
      }} />

      {/* Cream circle — bottom-right, partially off-screen */}
      <div style={{
        position: 'absolute', bottom: -60, right: '6%',
        width: 240, height: 240, borderRadius: '50%',
        backgroundColor: BRAND.cream, opacity: 0.55,
        boxShadow: '-6px -6px 0 rgba(0,0,0,0.06)',
        pointerEvents: 'none',
      }} />

      {/* Yellow tall pill — mid-left, half off-screen */}
      <div style={{
        position: 'absolute', top: '38%', left: -65,
        width: 120, height: 270, borderRadius: 60,
        backgroundColor: BRAND.yellow, opacity: 0.55,
        transform: 'rotate(18deg)',
        pointerEvents: 'none',
      }} />

      {/* Pink small circle — upper area, adds texture */}
      <div style={{
        position: 'absolute', top: '14%', left: '14%',
        width: 80, height: 80, borderRadius: '50%',
        backgroundColor: BRAND.pink, opacity: 0.22,
        pointerEvents: 'none',
      }} />

      {/* Cream small shape — mid-right */}
      <div style={{
        position: 'absolute', top: '55%', right: -40,
        width: 130, height: 130, borderRadius: '50%',
        backgroundColor: BRAND.cream, opacity: 0.35,
        pointerEvents: 'none',
      }} />

      {/* ── Page content ── */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 900, margin: '0 auto' }}>

        {/* ── Navbar — floating cream paper card ── */}
        <header style={{
          position: 'relative',
          backgroundColor: BRAND.cream,
          borderRadius: 20,
          padding: '16px 28px',
          marginBottom: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 8px 28px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)',
        }}>
          {/* User avatar + email */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              backgroundColor: BRAND.green,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>
                {user?.email?.[0]?.toUpperCase() ?? 'A'}
              </span>
            </div>
            <span style={{ fontSize: 13, color: BRAND.textMuted, fontWeight: 500 }}>
              {user?.email}
            </span>
          </div>

          {/* Centered system title */}
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }}>
            <h1 style={{
              margin: 0,
              fontSize: 19,
              fontWeight: 800,
              color: BRAND.text,
              letterSpacing: '-0.2px',
              direction: 'ltr',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}>
             BookLet. Let your Book come alive.
            </h1>
          </div>

          {/* Log out */}
          <button
            onClick={() => supabase.auth.signOut()}
            onMouseEnter={() => setLogoutHover(true)}
            onMouseLeave={() => setLogoutHover(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: logoutHover ? 'rgba(250,103,129,0.12)' : 'transparent',
              color: logoutHover ? BRAND.pink : BRAND.textMuted,
              border: 'none',
              cursor: 'pointer',
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              transition: 'background-color 0.16s, color 0.16s',
              fontFamily: 'inherit',
            }}
          >
            <LogOut size={14} />
            Log out
          </button>
        </header>

        {/* ── Welcome section ── */}
        <div style={{ marginBottom: 34, paddingLeft: 4 }}>
          <p style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            color: BRAND.yellow,
            letterSpacing: '0.7px',
            textTransform: 'uppercase',
          }}>
            Welcome back
          </p>
          <h2 style={{
            margin: '10px 0 0',
            fontSize: 42,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.5px',
            lineHeight: 1.1,
            fontFamily: 'inherit',
          }}>
            What would you like
          </h2>
          <h2 style={{
            margin: '4px 0 0',
            fontSize: 42,
            fontWeight: 800,
            color: BRAND.cream,
            letterSpacing: '-0.5px',
            lineHeight: 1.1,
            fontFamily: 'inherit',
          }}>
            to do today?
          </h2>
        </div>

        {/* ── Action cards ────────────────────────────────────────────────────
            Different proportions per card create visual interest.
            Booklets: wide (2/3 width, taller)
            Fonts:    square (1/3 width, same height as Booklets)
            Media:    horizontal strip (full width, shorter) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gridTemplateRows: 'auto auto',
          gap: 20,
        }}>

          {/* Booklets — wide yellow card */}
          <Link
            to="/admin/booklets"
            style={{ textDecoration: 'none', gridColumn: '1', gridRow: '1' }}
            onMouseEnter={() => setBookletsHover(true)}
            onMouseLeave={() => setBookletsHover(false)}
          >
            <div style={{
              backgroundColor: BRAND.yellow,
              borderRadius: 24,
              padding: '40px 44px',
              minHeight: 210,
              boxShadow: cardShadow(bookletsHover),
              transform: bookletsHover ? 'translateY(-6px)' : 'translateY(0)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                backgroundColor: 'rgba(0,0,0,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BookOpen size={26} color={BRAND.text} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: BRAND.text, letterSpacing: '-0.3px' }}>
                  Booklets
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgba(26,26,26,0.6)', fontWeight: 500 }}>
                  Create and publish digital booklets
                </p>
              </div>
            </div>
          </Link>

          {/* Fonts — square cream card */}
          <Link
            to="/admin/fonts"
            style={{ textDecoration: 'none', gridColumn: '2', gridRow: '1' }}
            onMouseEnter={() => setFontsHover(true)}
            onMouseLeave={() => setFontsHover(false)}
          >
            <div style={{
              backgroundColor: BRAND.cream,
              borderRadius: 24,
              padding: '36px',
              minHeight: 210,
              height: '100%',
              boxShadow: cardShadow(fontsHover),
              transform: fontsHover ? 'translateY(-6px)' : 'translateY(0)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                backgroundColor: 'rgba(0,0,0,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Type size={26} color={BRAND.text} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: BRAND.text, letterSpacing: '-0.3px' }}>
                  Fonts
                </p>
                <p style={{ margin: '5px 0 0', fontSize: 13, color: 'rgba(26,26,26,0.6)', fontWeight: 500 }}>
                  Manage custom typefaces
                </p>
              </div>
            </div>
          </Link>

          {/* Media — horizontal pink strip */}
          <Link
            to="/admin/media"
            style={{ textDecoration: 'none', gridColumn: '1 / -1', gridRow: '2' }}
            onMouseEnter={() => setMediaHover(true)}
            onMouseLeave={() => setMediaHover(false)}
          >
            <div style={{
              backgroundColor: BRAND.pink,
              borderRadius: 24,
              padding: '32px 44px',
              minHeight: 130,
              boxShadow: cardShadow(mediaHover),
              transform: mediaHover ? 'translateY(-6px)' : 'translateY(0)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 28,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                flexShrink: 0,
                backgroundColor: 'rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ImageIcon size={26} color="#fff" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                  Media
                </p>
                <p style={{ margin: '5px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.82)', fontWeight: 500 }}>
                  Upload and manage background images
                </p>
              </div>
            </div>
          </Link>

        </div>
      </div>
    </div>
  );
}
