import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ImageIcon, Type, LogOut } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { BRAND } from '@/config/theme';
import { CreditsPanel } from '@/reader/CreditsPanel';
import { ADMIN_DASHBOARD_STACK_BREAKPOINT } from '@/config/admin';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import { AdminPageShell } from '@/admin/shell/AdminPageShell';
import { cardShadow } from '@/admin/shell/adminControls';

// Admin nav hub — booklets/fonts/media each get their own page rather than
// living here, so this stays a thin index rather than growing into a
// catch-all.
export function DashboardPage() {
  const { user } = useAuth();
  const [bookletsHover, setBookletsHover] = useState(false);
  const [fontsHover, setFontsHover] = useState(false);
  const [mediaHover, setMediaHover] = useState(false);
  const [logoutHover, setLogoutHover] = useState(false);

  // Below the stack breakpoint the action cards collapse to a single column;
  // once they stack, the content can exceed the viewport, so the hub's
  // fixed-height / no-scroll rule is relaxed to allow vertical scrolling.
  const stacked = useViewportWidth() < ADMIN_DASHBOARD_STACK_BREAKPOINT;

  return (
    <AdminPageShell variant="dashboard" hubScroll={stacked} footer={<CreditsPanel />}>

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
          // Single stacked column on narrow screens; the 2fr/1fr split otherwise.
          gridTemplateColumns: stacked ? '1fr' : '2fr 1fr',
          gridTemplateRows: 'auto auto',
          gap: 20,
        }}>

          {/* Booklets — wide yellow card */}
          <Link
            to="/admin/booklets"
            style={{ textDecoration: 'none', gridColumn: stacked ? 'auto' : '1', gridRow: stacked ? 'auto' : '1' }}
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
            style={{ textDecoration: 'none', gridColumn: stacked ? 'auto' : '2', gridRow: stacked ? 'auto' : '1' }}
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
            style={{ textDecoration: 'none', gridColumn: stacked ? 'auto' : '1 / -1', gridRow: stacked ? 'auto' : '2' }}
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
    </AdminPageShell>
  );
}
