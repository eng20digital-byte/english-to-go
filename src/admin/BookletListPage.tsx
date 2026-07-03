import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Check, Copy, ExternalLink, Plus, SearchX, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookletLibraryToolbar } from '@/admin/BookletLibraryToolbar';
import {
  countBookletsByStatus,
  filterAndSortBooklets,
} from '@/admin/bookletLibraryFilters';
import {
  DEFAULT_BOOKLET_SORT,
  DEFAULT_BOOKLET_STATUS_FILTER,
  type BookletSortValue,
  type BookletStatusFilter,
} from '@/config/booklets';
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
import { AdminPageShell } from '@/admin/shell/AdminPageShell';
import { AdminPageHeader } from '@/admin/shell/AdminPageHeader';
import { EmptyState } from '@/admin/shell/EmptyState';
import {
  BTN_BASE,
  CARD_COLORS,
  inputStyle,
  submitButtonStyle,
  type CardPalette,
} from '@/admin/shell/adminControls';

function readerUrl(token: string): string {
  return `${window.location.origin}/b/${token}`;
}

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

export function BookletListPage() {
  const { data: booklets, isLoading } = useBookletsQuery();
  const createBooklet = useCreateBookletMutation();
  const deleteBooklet = useDeleteBookletMutation();
  const updateStatus = useUpdateBookletStatusMutation();

  const [title, setTitle] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BookletRow | null>(null);
  const [reenableTarget, setReenableTarget] = useState<BookletRow | null>(null);

  // Search / filter / sort — pure view state, never persisted.
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookletStatusFilter>(
    DEFAULT_BOOKLET_STATUS_FILTER,
  );
  const [sort, setSort] = useState<BookletSortValue>(DEFAULT_BOOKLET_SORT);

  const counts = useMemo(() => countBookletsByStatus(booklets ?? []), [booklets]);
  const visibleBooklets = useMemo(
    () => filterAndSortBooklets(booklets ?? [], { search, status: statusFilter, sort }),
    [booklets, search, statusFilter, sort],
  );
  const isFiltering = search.trim() !== '' || statusFilter !== DEFAULT_BOOKLET_STATUS_FILTER;
  const hasBooklets = !!booklets && booklets.length > 0;

  function clearFilters() {
    setSearch('');
    setStatusFilter(DEFAULT_BOOKLET_STATUS_FILTER);
  }

  // Styling states
  const [titleFocused, setTitleFocused] = useState(false);
  const [submitHover, setSubmitHover] = useState(false);
  const [submitActive, setSubmitActive] = useState(false);

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

  // The toolbar input flexes to fill its row instead of a fixed width.
  const titleInputStyle = inputStyle(titleFocused, { width: undefined, flex: 1, minWidth: 0 });

  return (
    <AdminPageShell variant="booklets">

        <AdminPageHeader
          accent="pink"
          icon={<BookOpen size={24} color="#fff" />}
          title="Booklets"
          subtitle="Create and manage your digital booklets. Each booklet gets a unique public link."
        />

        {/* ── Create + library controls row ──
            Side by side on wide screens, stacked on narrow ones. Create takes
            ~38% and the toolbar ~62% via flex-grow on a zero basis; the
            minWidths are what force the wrap to a vertical stack when there's
            no longer room for both. */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'stretch',
          gap: 28,
          marginBottom: 36,
        }}>

        {/* ── Create booklet — cream paper card ── */}
        <div style={{
          backgroundColor: BRAND.cream,
          borderRadius: 24,
          padding: '22px 36px 36px',
          flexGrow: 38,
          flexBasis: 0,
          minWidth: 280,
          boxShadow: '0 8px 28px rgba(0,0,0,0.13), 0 2px 6px rgba(0,0,0,0.08)',
        }}>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 200 }}>
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
                style={submitButtonStyle(
                  { hover: submitHover, active: submitActive, pending: createBooklet.isPending },
                  {
                    padding: '11px 24px',
                    fontSize: 14,
                    boxShadow: '0 4px 0 rgba(0,0,0,0.1)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    flexShrink: 0,
                    // Align with input bottom edge
                    marginBottom: 0,
                  },
                )}
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

        {/* ── Search / filter / sort toolbar — fills the wider ~62% column ── */}
        {!isLoading && hasBooklets && (
          <BookletLibraryToolbar
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sort={sort}
            onSortChange={setSort}
            counts={counts}
            style={{ flexGrow: 62, flexBasis: 0, minWidth: 340, marginBottom: 0 }}
          />
        )}
        </div>{/* end create + controls row */}

        {/* ── Gallery section label (with result count while filtering) ── */}
        {!isLoading && hasBooklets && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '0 0 20px' }}>
            <p style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 700,
              color: BRAND.yellow,
              letterSpacing: '0.7px',
              textTransform: 'uppercase',
            }}>
              Your booklets
            </p>
            {isFiltering && (
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                {visibleBooklets.length} of {booklets!.length}
              </span>
            )}
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div style={{
            display: 'grid',
            // Auto-fill keeps each card to a sensible width (so they don't stretch
            // too wide) while the row total still fills the top-panel width, and
            // collapses to a single column on narrow/mobile viewports — no media
            // query needed, which inline styles can't express anyway.
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 24,
          }}>
            {[0, 1, 2].map((i) => <BookletCardSkeleton key={i} />)}
          </div>
        )}

        {!isLoading && booklets?.length === 0 && (
          <EmptyState
            accent="green"
            icon={<BookOpen size={24} color={BRAND.green} />}
            title="No booklets yet"
            subtitle="Create your first booklet using the form above."
          />
        )}

        {/* Library has booklets but the active filters hide them all — distinct
            from the empty library so the admin knows to loosen filters. */}
        {!isLoading && hasBooklets && visibleBooklets.length === 0 && (
          <EmptyState
            accent="pink"
            icon={<SearchX size={24} color={BRAND.pink} />}
            title="No booklets match your filters"
            subtitle="Try a different search term or status."
            padding="52px 24px"
            action={{ label: 'Clear filters', onClick: clearFilters }}
          />
        )}

        {/* Booklet gallery */}
        {!isLoading && visibleBooklets.length > 0 && (
          <div style={{
            display: 'grid',
            // See skeleton grid above — responsive auto-fill so cards stay a
            // sensible width and stack into one column on mobile.
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 24,
          }}>
            {visibleBooklets.map((booklet, index) => (
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
    </AdminPageShell>
  );
}
