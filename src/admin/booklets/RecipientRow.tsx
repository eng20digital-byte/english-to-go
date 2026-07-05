import { useState } from 'react';
import { CalendarClock, Check, Copy, ExternalLink, RotateCw, Trash2, X } from 'lucide-react';
import type { BookletRecipientRow, RecipientStatus } from '@/types/database';
import { RecipientStatusBadge } from '@/admin/booklets/RecipientStatusBadge';
import { BTN_BASE } from '@/admin/shell/adminControls';
import {
  expiryDateToIso,
  formatExpiryDate,
  isoToExpiryDate,
  minExpiryDate,
  recipientEffectiveStatus,
} from '@/config/recipients';
import { BRAND } from '@/config/theme';

function readerUrl(token: string): string {
  return `${window.location.origin}/b/${token}`;
}

// One recipient: name · status badge · publish/unpublish toggle · copy-link ·
// rotate-link · delete (right-pushed), plus an expiry-date control (RP4). Reuses
// the readerUrl + "Copied" copy idiom and BTN_BASE pill chrome from BookletCard.
interface RecipientRowProps {
  recipient: BookletRecipientRow;
  onSetStatus: (status: RecipientStatus) => void;
  onSetExpiry: (expiresAt: string | null) => void;
  onRotate: () => void;
  onDelete: () => void;
  isBusy: boolean;
  // Multi-select (RP5): drives the bulk publish/unpublish/delete bar.
  selected: boolean;
  onToggleSelect: () => void;
}

export function RecipientRow({
  recipient,
  onSetStatus,
  onSetExpiry,
  onRotate,
  onDelete,
  isBusy,
  selected,
  onToggleSelect,
}: RecipientRowProps) {
  const [copied, setCopied] = useState(false);
  const [btnHover, setBtnHover] = useState<string | null>(null);
  const [linkHover, setLinkHover] = useState(false);

  const url = readerUrl(recipient.access_token);
  const isPublished = recipient.status === 'published';

  // Effective status drives the badge + expiry label so "Expired" appears the
  // instant the date passes, without waiting on the lazy server-side flip.
  const effective = recipientEffectiveStatus(recipient);
  const isExpired = effective === 'expired';
  const dateValue = recipient.expires_at ? isoToExpiryDate(recipient.expires_at) : '';

  const expiryLabel = !recipient.expires_at
    ? 'No expiry'
    : isExpired
      ? `Expired ${formatExpiryDate(recipient.expires_at)}`
      : `Active until ${formatExpiryDate(recipient.expires_at)}`;

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const neutralBtn = (key: string, extra?: React.CSSProperties): React.CSSProperties => ({
    ...BTN_BASE,
    padding: '8px 14px',
    fontSize: 13,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: btnHover === key ? 'rgba(0,0,0,0.13)' : 'rgba(0,0,0,0.07)',
    color: BRAND.text,
    opacity: isBusy ? 0.6 : 1,
    cursor: isBusy ? 'not-allowed' : 'pointer',
    ...extra,
  });

  return (
    <div
      style={{
        backgroundColor: BRAND.cream,
        borderRadius: 16,
        padding: '18px 20px',
        boxShadow: selected
          ? `0 0 0 2px ${BRAND.green}, 0 4px 16px rgba(0,0,0,0.1)`
          : '0 4px 16px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.16s',
      }}
    >
      {/* Top line: select + name + badge (left) · actions (right) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={`Select ${recipient.name}`}
          style={{
            width: 17,
            height: 17,
            flexShrink: 0,
            accentColor: BRAND.green,
            cursor: 'pointer',
          }}
        />
        <span style={{ fontSize: 16, fontWeight: 800, color: BRAND.text, wordBreak: 'break-word' }}>
          {recipient.name}
        </span>
        <RecipientStatusBadge status={effective} />

        {/* Publish / Unpublish toggle */}
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onSetStatus(isPublished ? 'unpublished' : 'published')}
          onMouseEnter={() => setBtnHover('toggle')}
          onMouseLeave={() => setBtnHover(null)}
          style={
            isPublished
              ? neutralBtn('toggle')
              : {
                  ...BTN_BASE,
                  padding: '8px 16px',
                  fontSize: 13,
                  backgroundColor: btnHover === 'toggle' ? BRAND.greenDark : BRAND.green,
                  color: '#fff',
                  opacity: isBusy ? 0.6 : 1,
                  cursor: isBusy ? 'not-allowed' : 'pointer',
                }
          }
        >
          {isPublished ? 'Unpublish' : 'Publish'}
        </button>

        {/* Rotate — mint a fresh token, killing the old link */}
        <button
          type="button"
          disabled={isBusy}
          onClick={onRotate}
          title="Generate a new link (revokes the current one)"
          onMouseEnter={() => setBtnHover('rotate')}
          onMouseLeave={() => setBtnHover(null)}
          style={neutralBtn('rotate')}
        >
          <RotateCw size={13} />
          New link
        </button>

        {/* Delete — pushed right */}
        <button
          type="button"
          disabled={isBusy}
          onClick={onDelete}
          aria-label={`Delete ${recipient.name}`}
          onMouseEnter={() => setBtnHover('delete')}
          onMouseLeave={() => setBtnHover(null)}
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            backgroundColor: btnHover === 'delete' ? 'rgba(250,103,129,0.14)' : 'transparent',
            border: 'none',
            cursor: isBusy ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: BRAND.pink,
            transition: 'background-color 0.16s',
            marginLeft: 'auto',
            padding: 0,
            opacity: isBusy ? 0.5 : 1,
            fontFamily: 'inherit',
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Expiry control — pick a date to auto-unpublish; a future date also
          (re)publishes the link (mutation), so it doubles as a timed go-live.
          Label shows "Active until …" / "Expired …" via the effective status. */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}
      >
        <CalendarClock size={15} style={{ flexShrink: 0, color: BRAND.textMuted }} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: isExpired ? BRAND.pink : BRAND.textMuted,
          }}
        >
          {expiryLabel}
        </span>
        <input
          type="date"
          value={dateValue}
          min={minExpiryDate()}
          disabled={isBusy}
          onChange={(e) => onSetExpiry(e.target.value ? expiryDateToIso(e.target.value) : null)}
          aria-label={`Set expiry date for ${recipient.name}`}
          style={{
            ...BTN_BASE,
            padding: '7px 12px',
            fontSize: 13,
            fontWeight: 600,
            backgroundColor: 'rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.08)',
            color: BRAND.text,
            cursor: isBusy ? 'not-allowed' : 'pointer',
            opacity: isBusy ? 0.6 : 1,
          }}
        />
        {recipient.expires_at && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onSetExpiry(null)}
            title="Clear expiry date"
            onMouseEnter={() => setBtnHover('clearExpiry')}
            onMouseLeave={() => setBtnHover(null)}
            style={neutralBtn('clearExpiry', { padding: '7px 12px' })}
          >
            <X size={13} />
            Clear
          </button>
        )}
      </div>

      {/* Link chip — the recipient's own private /b/:token link */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 7px 7px 12px',
          borderRadius: 12,
          backgroundColor: 'rgba(0,0,0,0.045)',
          border: '1px solid rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        <ExternalLink size={13} style={{ flexShrink: 0, color: BRAND.textMuted }} />
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          onMouseEnter={() => setLinkHover(true)}
          onMouseLeave={() => setLinkHover(false)}
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 13,
            fontWeight: 600,
            color: BRAND.text,
            textDecoration: linkHover ? 'underline' : 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {url}
        </a>
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
              : btnHover === 'copy'
                ? 'rgba(0,0,0,0.13)'
                : 'rgba(0,0,0,0.07)',
            color: copied ? BRAND.green : BRAND.text,
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
  );
}
