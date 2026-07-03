import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Check, Copy, ExternalLink, Trash2 } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import type { BookletRow } from '@/types/database';
import { BRAND } from '@/config/theme';
import { BTN_BASE, type CardPalette } from '@/admin/shell/adminControls';

function readerUrl(token: string): string {
  return `${window.location.origin}/b/${token}`;
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
export function BookletCard({
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

      {/* Public reader link — contained "share link" chip. The token is the only
          way to reach the published booklet, so it gets a clear label and its own
          surface rather than being a muted afterthought under the title. */}
      <div style={{ marginBottom: 24 }}>
        <p style={{
          margin: '0 0 7px',
          fontSize: 10,
          fontWeight: 700,
          color: palette.textMuted,
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
        }}>
          Public link
        </p>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 7px 7px 12px',
          borderRadius: 12,
          backgroundColor: palette.chipBg,
          border: `1px solid ${palette.separatorColor}`,
          overflow: 'hidden',
        }}>
          <ExternalLink size={13} style={{ flexShrink: 0, color: palette.textMuted }} />
          <a
            href={readerUrl(booklet.public_token)}
            target="_blank"
            rel="noreferrer"
            onClick={stop}
            onMouseEnter={() => setLinkHover(true)}
            onMouseLeave={() => setLinkHover(false)}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 13,
              fontWeight: 600,
              color: palette.text,
              textDecoration: linkHover ? 'underline' : 'none',
              transition: 'color 0.15s',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {readerUrl(booklet.public_token)}
          </a>

          {/* Copy URL button — labeled so it reads as the primary affordance */}
          <button
            type="button"
            onClick={handleCopy}
            title="Copy link"
            onMouseEnter={() => setBtnHover('copy')}
            onMouseLeave={() => setBtnHover(null)}
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              height: 30,
              padding: '0 12px',
              borderRadius: 9,
              border: 'none',
              backgroundColor: copied
                ? 'rgba(89,178,146,0.18)'
                : btnHover === 'copy' ? palette.neutralBtnBgHover : palette.neutralBtnBg,
              color: copied ? BRAND.green : palette.neutralBtnText,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              transition: 'background-color 0.16s, color 0.16s',
              fontFamily: 'inherit',
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
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
