import { useMemo, useState } from 'react';
import { BookOpen, Plus, SearchX } from 'lucide-react';
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
import { CARD_COLORS, inputStyle, submitButtonStyle } from '@/admin/shell/adminControls';
import { BookletCard } from '@/admin/booklets/BookletCard';
import { BookletCardSkeleton } from '@/admin/booklets/BookletCardSkeleton';

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
