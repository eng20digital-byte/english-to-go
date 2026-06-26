import { useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Check, Copy, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/Spinner';
import { StatusBadge } from '@/components/StatusBadge';
import {
  useBookletsQuery,
  useCreateBookletMutation,
  useDeleteBookletMutation,
  useUpdateBookletStatusMutation,
} from '@/hooks/useBookletQuery';
import type { BookletRow } from '@/types/database';
import { BRAND } from '@/config/theme';

function readerUrl(token: string): string {
  return `${window.location.origin}/b/${token}`;
}

// Cycling color palette for booklet cards — cream → yellow → pink → repeat.
// Each entry carries everything a card needs to look great on its background.
type CardPalette = {
  bg: string;
  text: string;
  textMuted: string;
  iconBg: string;
  iconColor: string;
  separatorColor: string;
  neutralBtnBg: string;
  neutralBtnBgHover: string;
  neutralBtnText: string;
};

const CARD_COLORS: CardPalette[] = [
  {
    bg: BRAND.cream,
    text: BRAND.text,
    textMuted: BRAND.textMuted,
    iconBg: BRAND.green,
    iconColor: '#fff',
    separatorColor: 'rgba(0,0,0,0.08)',
    neutralBtnBg: 'rgba(0,0,0,0.07)',
    neutralBtnBgHover: 'rgba(0,0,0,0.13)',
    neutralBtnText: BRAND.text,
  },
  {
    bg: BRAND.yellow,
    text: BRAND.text,
    textMuted: 'rgba(26,26,26,0.6)',
    iconBg: 'rgba(0,0,0,0.09)',
    iconColor: BRAND.text,
    separatorColor: 'rgba(0,0,0,0.1)',
    neutralBtnBg: 'rgba(0,0,0,0.09)',
    neutralBtnBgHover: 'rgba(0,0,0,0.16)',
    neutralBtnText: BRAND.text,
  },
  {
    bg: BRAND.pink,
    text: '#fff',
    textMuted: 'rgba(255,255,255,0.72)',
    iconBg: 'rgba(255,255,255,0.22)',
    iconColor: '#fff',
    separatorColor: 'rgba(255,255,255,0.2)',
    neutralBtnBg: 'rgba(255,255,255,0.2)',
    neutralBtnBgHover: 'rgba(255,255,255,0.32)',
    neutralBtnText: '#fff',
  },
];

const BTN_BASE: CSSProperties = {
  border: 'none',
  borderRadius: 12,
  padding: '10px 20px',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'background-color 0.16s',
  fontFamily: 'inherit',
  lineHeight: 1,
};

function BookletCardSkeleton() {
  return (
    <div style={{
      backgroundColor: BRAND.cream,
      borderRadius: 24,
      padding: '28px 28px 24px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(89,178,146,0.15)', animation: 'sk-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: 72, height: 22, borderRadius: 11, backgroundColor: 'rgba(26,26,26,0.08)', animation: 'sk-pulse 1.5s ease-in-out infinite' }} />
      </div>
      <div style={{ height: 22, width: '70%', borderRadius: 6, backgroundColor: 'rgba(26,26,26,0.1)', marginBottom: 10, animation: 'sk-pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: 13, width: '88%', borderRadius: 4, backgroundColor: 'rgba(26,26,26,0.06)', marginBottom: 20, animation: 'sk-pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ height: 34, width: 72, borderRadius: 10, backgroundColor: 'rgba(89,178,146,0.2)', animation: 'sk-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 34, width: 80, borderRadius: 10, backgroundColor: 'rgba(255,201,77,0.25)', animation: 'sk-pulse 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  );
}

function EmptyBooklets() {
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
        <BookOpen size={24} color={BRAND.green} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: BRAND.text }}>
          No booklets yet
        </p>
        <p style={{ margin: '5px 0 0', fontSize: 14, color: BRAND.textMuted }}>
          Create your first booklet using the form above.
        </p>
      </div>
    </div>
  );
}

interface BookletCardProps {
  booklet: BookletRow;
  palette: CardPalette;
  onPublish: () => void;
  onUnpublish: () => void;
  onDisable: () => void;
  onReenable: () => void;
  onDelete: () => void;
  isUpdating: boolean;
}

// Action set depends on status — see CLAUDE.md "No draft/live content fork"
// for why disable/re-enable is a separate, asymmetric-risk action from the
// plain draft<->published toggle.
function BookletCard({
  booklet,
  palette,
  onPublish,
  onUnpublish,
  onDisable,
  onReenable,
  onDelete,
  isUpdating,
}: BookletCardProps) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [btnHover, setBtnHover] = useState<string | null>(null);
  const [linkHover, setLinkHover] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(readerUrl(booklet.public_token)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function stop(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div
      onClick={() => navigate(`/admin/booklets/${booklet.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer',
        backgroundColor: palette.bg,
        borderRadius: 24,
        padding: '36px 36px 32px',
        minHeight: 290,
        boxShadow: hovered
          ? '0 20px 50px rgba(0,0,0,0.2), 0 8px 20px rgba(0,0,0,0.12)'
          : '0 8px 24px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)',
        transform: hovered ? 'translateY(-6px) scale(1.01)' : 'translateY(0) scale(1)',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease',
        color: palette.text,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
      }}
    >
      {/* Top row: icon + status badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 15, flexShrink: 0,
          backgroundColor: palette.iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <BookOpen size={24} color={palette.iconColor} />
        </div>
        <StatusBadge status={booklet.status} />
      </div>

      {/* Title */}
      <h3 style={{
        margin: '0 0 10px',
        fontSize: 22,
        fontWeight: 800,
        color: palette.text,
        letterSpacing: '-0.3px',
        lineHeight: 1.25,
        wordBreak: 'break-word',
      }}>
        {booklet.title}
      </h3>

      {/* Reader URL row: link + copy button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, overflow: 'hidden' }}>
        <a
          href={readerUrl(booklet.public_token)}
          target="_blank"
          rel="noreferrer"
          onClick={stop}
          onMouseEnter={() => setLinkHover(true)}
          onMouseLeave={() => setLinkHover(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            color: linkHover ? palette.text : palette.textMuted,
            textDecoration: linkHover ? 'underline' : 'none',
            transition: 'color 0.15s',
            overflow: 'hidden',
            flex: 1,
            minWidth: 0,
          }}
        >
          <ExternalLink size={12} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {readerUrl(booklet.public_token)}
          </span>
        </a>

        {/* Copy URL button */}
        <button
          type="button"
          onClick={handleCopy}
          title="Copy link"
          style={{
            flexShrink: 0,
            width: 28, height: 28,
            borderRadius: 8,
            border: 'none',
            backgroundColor: copied
              ? 'rgba(89,178,146,0.18)'
              : btnHover === 'copy' ? palette.neutralBtnBgHover : palette.neutralBtnBg,
            color: copied ? BRAND.green : palette.textMuted,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background-color 0.16s, color 0.16s',
            padding: 0,
            fontFamily: 'inherit',
          }}
          onMouseEnter={() => setBtnHover('copy')}
          onMouseLeave={() => setBtnHover(null)}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>

      {/* Separator */}
      <div style={{ height: 1, backgroundColor: palette.separatorColor, marginBottom: 20 }} />

      {/* Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 'auto' }}>

        {/* Open — primary action, always green */}
        <Link
          to={`/admin/booklets/${booklet.id}`}
          onClick={stop}
          onMouseEnter={() => setBtnHover('open')}
          onMouseLeave={() => setBtnHover(null)}
          style={{
            ...BTN_BASE,
            backgroundColor: btnHover === 'open' ? BRAND.greenDark : BRAND.green,
            color: '#fff',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Open
        </Link>

        {/* Draft → Publish */}
        {booklet.status === 'draft' && (
          <button
            onClick={(e) => { stop(e); onPublish(); }}
            disabled={isUpdating}
            onMouseEnter={() => setBtnHover('publish')}
            onMouseLeave={() => setBtnHover(null)}
            style={{
              ...BTN_BASE,
              backgroundColor: btnHover === 'publish' ? BRAND.yellowDark : BRAND.yellow,
              color: BRAND.text,
              opacity: isUpdating ? 0.6 : 1,
              cursor: isUpdating ? 'not-allowed' : 'pointer',
            }}
          >
            Publish
          </button>
        )}

        {/* Published → Unpublish + Disable */}
        {booklet.status === 'published' && (
          <>
            <button
              onClick={(e) => { stop(e); onUnpublish(); }}
              disabled={isUpdating}
              onMouseEnter={() => setBtnHover('unpublish')}
              onMouseLeave={() => setBtnHover(null)}
              style={{
                ...BTN_BASE,
                backgroundColor: btnHover === 'unpublish' ? palette.neutralBtnBgHover : palette.neutralBtnBg,
                color: palette.neutralBtnText,
                opacity: isUpdating ? 0.6 : 1,
                cursor: isUpdating ? 'not-allowed' : 'pointer',
              }}
            >
              Unpublish
            </button>
            <button
              onClick={(e) => { stop(e); onDisable(); }}
              disabled={isUpdating}
              onMouseEnter={() => setBtnHover('disable')}
              onMouseLeave={() => setBtnHover(null)}
              style={{
                ...BTN_BASE,
                backgroundColor: btnHover === 'disable' ? '#e0536e' : BRAND.pink,
                color: '#fff',
                opacity: isUpdating ? 0.6 : 1,
                cursor: isUpdating ? 'not-allowed' : 'pointer',
              }}
            >
              Disable
            </button>
          </>
        )}

        {/* Disabled → Re-enable */}
        {booklet.status === 'disabled' && (
          <button
            onClick={(e) => { stop(e); onReenable(); }}
            disabled={isUpdating}
            onMouseEnter={() => setBtnHover('reenable')}
            onMouseLeave={() => setBtnHover(null)}
            style={{
              ...BTN_BASE,
              backgroundColor: btnHover === 'reenable' ? BRAND.yellowDark : BRAND.yellow,
              color: BRAND.text,
              opacity: isUpdating ? 0.6 : 1,
              cursor: isUpdating ? 'not-allowed' : 'pointer',
            }}
          >
            Re-enable
          </button>
        )}

        {/* Delete — always pushed to the right */}
        <button
          onClick={(e) => { stop(e); onDelete(); }}
          disabled={isUpdating}
          onMouseEnter={() => setBtnHover('delete')}
          onMouseLeave={() => setBtnHover(null)}
          aria-label={`Delete ${booklet.title}`}
          style={{
            width: 34, height: 34,
            borderRadius: 9,
            backgroundColor: btnHover === 'delete' ? 'rgba(250,103,129,0.14)' : 'transparent',
            border: 'none',
            cursor: isUpdating ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: BRAND.pink,
            transition: 'background-color 0.16s',
            marginLeft: 'auto',
            padding: 0,
            opacity: isUpdating ? 0.5 : 1,
            fontFamily: 'inherit',
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export function BookletListPage() {
  const { data: booklets, isLoading } = useBookletsQuery();
  const createBooklet = useCreateBookletMutation();
  const deleteBooklet = useDeleteBookletMutation();
  const updateStatus = useUpdateBookletStatusMutation();

  const [title, setTitle] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BookletRow | null>(null);
  const [reenableTarget, setReenableTarget] = useState<BookletRow | null>(null);

  // Styling states
  const [titleFocused, setTitleFocused] = useState(false);
  const [submitHover, setSubmitHover] = useState(false);
  const [submitActive, setSubmitActive] = useState(false);
  const [backLinkHover, setBackLinkHover] = useState(false);

  async function handleSubmit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    setFormError(null);
    const form = event.currentTarget;
    try {
      await createBooklet.mutateAsync(title);
      form.reset();
      setTitle('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to create booklet.');
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteBooklet.mutate(deleteTarget.id);
    setDeleteTarget(null);
  }

  function confirmReenable() {
    if (!reenableTarget) return;
    updateStatus.mutate({ id: reenableTarget.id, status: 'published' });
    setReenableTarget(null);
  }

  const titleInputStyle: CSSProperties = {
    backgroundColor: BRAND.creamLight,
    border: `2px solid ${titleFocused ? BRAND.green : 'transparent'}`,
    borderRadius: 12,
    padding: '11px 14px',
    fontSize: 14,
    outline: 'none',
    boxShadow: titleFocused ? `0 0 0 4px rgba(89,178,146,0.18)` : 'none',
    transition: 'border-color 0.18s, box-shadow 0.18s',
    color: BRAND.text,
    flex: 1,
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
    minWidth: 0,
  };

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
      {/* ── Background geometric shapes ── */}

      {/* Large yellow circle — top-left corner */}
      <div style={{
        position: 'absolute', top: -130, left: -150,
        width: 420, height: 420, borderRadius: '50%',
        backgroundColor: BRAND.yellow,
        boxShadow: '10px 14px 0 rgba(0,0,0,0.09)',
        pointerEvents: 'none',
      }} />

      {/* Pink rounded rectangle — bottom-right */}
      <div style={{
        position: 'absolute', bottom: -100, right: -90,
        width: 360, height: 310, borderRadius: 58,
        backgroundColor: BRAND.pink,
        transform: 'rotate(13deg)',
        boxShadow: '-8px -10px 0 rgba(0,0,0,0.08)',
        pointerEvents: 'none',
      }} />

      {/* Cream circle — bottom-left */}
      <div style={{
        position: 'absolute', bottom: -70, left: -60,
        width: 250, height: 250, borderRadius: '50%',
        backgroundColor: BRAND.cream, opacity: 0.55,
        boxShadow: '8px 6px 0 rgba(0,0,0,0.06)',
        pointerEvents: 'none',
      }} />

      {/* Yellow tall pill — mid-right, half off-screen */}
      <div style={{
        position: 'absolute', top: '32%', right: -70,
        width: 130, height: 300, borderRadius: 65,
        backgroundColor: BRAND.yellow, opacity: 0.55,
        transform: 'rotate(-18deg)',
        pointerEvents: 'none',
      }} />

      {/* Pink small pill — upper-left area */}
      <div style={{
        position: 'absolute', top: '10%', left: '12%',
        width: 90, height: 170, borderRadius: 45,
        backgroundColor: BRAND.pink, opacity: 0.22,
        transform: 'rotate(28deg)',
        pointerEvents: 'none',
      }} />

      {/* Cream small circle — mid-right */}
      <div style={{
        position: 'absolute', top: '58%', right: -40,
        width: 130, height: 130, borderRadius: '50%',
        backgroundColor: BRAND.cream, opacity: 0.38,
        pointerEvents: 'none',
      }} />

      {/* ── Page content ── */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 900, margin: '0 auto' }}>

        {/* ── Floating header card — identical style to Media Library & Font Library ── */}
        <header style={{
          backgroundColor: BRAND.cream,
          borderRadius: 20,
          padding: '24px 32px 28px',
          marginBottom: 28,
          boxShadow: '0 8px 28px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)',
        }}>
          {/* Same pill treatment as the Font Library back link, but in the
              brand pink (rgba of BRAND.pink #FA6781) instead of green. */}
          <Link
            to="/admin"
            onMouseEnter={() => setBackLinkHover(true)}
            onMouseLeave={() => setBackLinkHover(false)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 14px 7px 10px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              color: backLinkHover ? BRAND.text : BRAND.pink,
              backgroundColor: backLinkHover ? 'rgba(250,103,129,0.14)' : 'rgba(250,103,129,0.08)',
              border: `1.5px solid ${backLinkHover ? 'rgba(250,103,129,0.4)' : 'rgba(250,103,129,0.2)'}`,
              textDecoration: 'none',
              marginBottom: 18,
              transition: 'all 0.15s',
            }}
          >
            <ArrowLeft size={14} />
            Back to Dashboard
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
                Booklets
              </h1>
              <p style={{
                margin: '7px 0 0',
                fontSize: 14,
                color: BRAND.textMuted,
                fontWeight: 500,
                lineHeight: 1.5,
              }}>
                Create and manage your digital booklets. Each booklet gets a unique public link.
              </p>
            </div>
            {/* Icon badge — pink to match the pink back-to-dashboard link */}
            <div style={{
              width: 52, height: 52,
              borderRadius: 16,
              backgroundColor: BRAND.pink,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              marginLeft: 20,
              boxShadow: '4px 4px 0 rgba(0,0,0,0.1)',
            }}>
              <BookOpen size={24} color="#fff" />
            </div>
          </div>
        </header>

        {/* ── Create booklet — cream paper card ── */}
        <div style={{
          backgroundColor: BRAND.cream,
          borderRadius: 24,
          padding: '32px 36px 36px',
          marginBottom: 36,
          boxShadow: '0 8px 28px rgba(0,0,0,0.13), 0 2px 6px rgba(0,0,0,0.08)',
        }}>
          <p style={{
            margin: '0 0 20px',
            fontSize: 11,
            fontWeight: 700,
            color: BRAND.textMuted,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
          }}>
            New Booklet
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 200 }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: BRAND.text,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}>
                  Title
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="My English Booklet"
                  required
                  onFocus={() => setTitleFocused(true)}
                  onBlur={() => setTitleFocused(false)}
                  style={titleInputStyle}
                />
              </label>

              <button
                type="submit"
                disabled={createBooklet.isPending}
                onMouseEnter={() => setSubmitHover(true)}
                onMouseLeave={() => { setSubmitHover(false); setSubmitActive(false); }}
                onMouseDown={() => setSubmitActive(true)}
                onMouseUp={() => setSubmitActive(false)}
                style={{
                  backgroundColor: (submitHover || createBooklet.isPending) ? BRAND.yellowDark : BRAND.yellow,
                  color: BRAND.text,
                  border: 'none',
                  borderRadius: 14,
                  padding: '11px 24px',
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.2px',
                  cursor: createBooklet.isPending ? 'not-allowed' : 'pointer',
                  transform: submitActive && !createBooklet.isPending ? 'scale(0.975)' : 'scale(1)',
                  transition: 'background-color 0.16s, transform 0.1s',
                  boxShadow: '0 4px 0 rgba(0,0,0,0.1)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: 'inherit',
                  flexShrink: 0,
                  // Align with input bottom edge
                  marginBottom: 0,
                }}
              >
                {createBooklet.isPending ? (
                  <>
                    <Spinner size="sm" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Create
                  </>
                )}
              </button>
            </div>

            {formError && (
              <p style={{ margin: '12px 0 0', fontSize: 13, fontWeight: 600, color: BRAND.pink }}>
                {formError}
              </p>
            )}
          </form>
        </div>

        {/* ── Gallery section label ── */}
        {!isLoading && booklets && booklets.length > 0 && (
          <p style={{
            margin: '0 0 20px',
            fontSize: 11,
            fontWeight: 700,
            color: BRAND.yellow,
            letterSpacing: '0.7px',
            textTransform: 'uppercase',
          }}>
            Your booklets
          </p>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 24,
          }}>
            {[0, 1, 2].map((i) => <BookletCardSkeleton key={i} />)}
          </div>
        )}

        {!isLoading && booklets?.length === 0 && <EmptyBooklets />}

        {/* Booklet gallery */}
        {!isLoading && booklets && booklets.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 24,
          }}>
            {booklets.map((booklet, index) => (
              <BookletCard
                key={booklet.id}
                booklet={booklet}
                palette={CARD_COLORS[index % CARD_COLORS.length]}
                isUpdating={updateStatus.isPending}
                onPublish={() => updateStatus.mutate({ id: booklet.id, status: 'published' })}
                onUnpublish={() => updateStatus.mutate({ id: booklet.id, status: 'draft' })}
                onDisable={() => updateStatus.mutate({ id: booklet.id, status: 'disabled' })}
                onReenable={() => setReenableTarget(booklet)}
                onDelete={() => setDeleteTarget(booklet)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Delete confirmation dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete booklet?</DialogTitle>
            <DialogDescription>
              This permanently removes <strong>"{deleteTarget?.title}"</strong> and all its pages
              and content. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Re-enable confirmation dialog ── */}
      <Dialog open={!!reenableTarget} onOpenChange={(open) => !open && setReenableTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-enable booklet?</DialogTitle>
            <DialogDescription>
              This restores public access to <strong>"{reenableTarget?.title}"</strong> at its
              existing link. Anyone with the link will be able to view it again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReenableTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirmReenable}>Re-enable</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
