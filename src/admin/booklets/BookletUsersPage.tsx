import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Search, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminPageShell } from '@/admin/shell/AdminPageShell';
import { AdminPageHeader } from '@/admin/shell/AdminPageHeader';
import { EmptyState } from '@/admin/shell/EmptyState';
import { inputStyle, submitButtonStyle } from '@/admin/shell/adminControls';
import { AddRecipientDialog } from '@/admin/booklets/AddRecipientDialog';
import { RecipientRow } from '@/admin/booklets/RecipientRow';
import { RecipientBulkBar } from '@/admin/booklets/RecipientBulkBar';
import { RecipientPager } from '@/admin/booklets/RecipientPager';
import { useBookletDetailQuery } from '@/hooks/useBookletQuery';
import {
  fetchAllRecipientTokens,
  useAddRecipientMutation,
  useBookletRecipientsQuery,
  useBulkDeleteRecipientsMutation,
  useBulkUpdateRecipientStatusMutation,
  useDeleteRecipientMutation,
  useRotateRecipientTokenMutation,
  useUpdateRecipientExpiryMutation,
  useUpdateRecipientStatusMutation,
} from '@/hooks/useBookletRecipientsQuery';
import type { BookletRecipientRow } from '@/types/database';
import { Spinner } from '@/components/Spinner';
import { RECIPIENT_SEARCH_DEBOUNCE_MS, RECIPIENTS_PAGE_SIZE } from '@/config/recipients';
import { BRAND } from '@/config/theme';

function readerUrl(token: string): string {
  return `${window.location.origin}/b/${token}`;
}

// The per-recipient publication surface: one page per booklet listing its
// recipients with add / publish-toggle / copy-link / rotate / delete, plus (RP5)
// server-side search + pagination and a bulk-action bar for publish/unpublish/
// delete across a checkbox selection or the whole booklet. Reached from the
// booklet card's "Manage users (N)". Sits at /admin/booklets/:bookletId/users.
export function BookletUsersPage() {
  const { bookletId } = useParams();
  const id = bookletId ?? '';

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState(''); // debounced, feeds the query
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiedAll, setCopiedAll] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BookletRecipientRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [addHover, setAddHover] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Debounce the typed search into the query param; any new search returns to the
  // first page so results aren't stranded on a now-out-of-range page.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, RECIPIENT_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: booklet } = useBookletDetailQuery(bookletId);
  const { data, isLoading } = useBookletRecipientsQuery(bookletId, { search, page });
  const recipients = data?.rows ?? [];
  const total = data?.total ?? 0;

  const addRecipient = useAddRecipientMutation(id);
  const updateStatus = useUpdateRecipientStatusMutation(id);
  const updateExpiry = useUpdateRecipientExpiryMutation(id);
  const rotateToken = useRotateRecipientTokenMutation(id);
  const deleteRecipient = useDeleteRecipientMutation(id);
  const bulkStatus = useBulkUpdateRecipientStatusMutation(id);
  const bulkDelete = useBulkDeleteRecipientsMutation(id);

  // One shared "busy" flag disables per-row + bulk actions while any recipient
  // mutation is in flight, so double-clicks can't race the invalidation refetch.
  const isBusy =
    updateStatus.isPending ||
    updateExpiry.isPending ||
    rotateToken.isPending ||
    deleteRecipient.isPending ||
    bulkStatus.isPending ||
    bulkDelete.isPending;

  // Clamp the page if the total shrank below its start (e.g. deleting the last
  // rows on the final page) so we never sit on an empty out-of-range page. This
  // is the React-sanctioned "adjust state during render" pattern (guarded, same
  // component) — an effect would trigger a cascading extra render.
  const pageCount = Math.max(1, Math.ceil(total / RECIPIENTS_PAGE_SIZE));
  if (page > pageCount - 1) {
    setPage(pageCount - 1);
  }

  const hasRecipients = total > 0;
  const pageIds = recipients.map((r) => r.id);
  const selectedOnPage = pageIds.filter((rid) => selectedIds.has(rid));
  const allOnPageSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length;
  const selectedList = useMemo(() => Array.from(selectedIds), [selectedIds]);

  function toggleSelect(rid: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(rid)) next.delete(rid);
      else next.add(rid);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((rid) => next.delete(rid));
      else pageIds.forEach((rid) => next.add(rid));
      return next;
    });
  }

  const clearSelection = () => setSelectedIds(new Set());

  function bulkSetSelected(status: 'published' | 'unpublished') {
    bulkStatus.mutate({ ids: selectedList, status }, { onSuccess: clearSelection });
  }

  function confirmBulkDelete() {
    bulkDelete.mutate(selectedList, { onSuccess: clearSelection });
    setBulkDeleteOpen(false);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteRecipient.mutate(deleteTarget.id);
    setDeleteTarget(null);
  }

  // Copy every recipient's link (across all pages, ignoring the current filter),
  // one per line — a separate read since the paginated query only holds one page.
  async function copyAllLinks() {
    const tokens = await fetchAllRecipientTokens(id);
    if (tokens.length === 0) return;
    await navigator.clipboard.writeText(tokens.map(readerUrl).join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  }

  return (
    <AdminPageShell variant="booklets">
      <AdminPageHeader
        accent="pink"
        icon={<Users size={24} color="#fff" />}
        backTo="/admin/booklets"
        backLabel="Back to Booklets"
        title={booklet?.title ?? 'Manage users'}
        subtitle="Manage who can access this booklet. Each user gets their own link."
      />

      {/* Search + add — only shown once at least one recipient exists; the empty
          state has its own action so there's never two competing "Add"s. */}
      {hasRecipients && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 20,
          }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: BRAND.textMuted,
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search users by name…"
              aria-label="Search users by name"
              style={inputStyle(searchFocused, { padding: '11px 40px' })}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  color: BRAND.textMuted,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            onMouseEnter={() => setAddHover(true)}
            onMouseLeave={() => setAddHover(false)}
            style={submitButtonStyle(
              { hover: addHover, active: false, pending: false },
              {
                padding: '11px 22px',
                fontSize: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 0 rgba(0,0,0,0.1)',
                flexShrink: 0,
              },
            )}
          >
            <Plus size={16} />
            Add user
          </button>
        </div>
      )}

      {hasRecipients && (
        <RecipientBulkBar
          selectedCount={selectedList.length}
          allOnPageSelected={allOnPageSelected}
          onToggleSelectAll={toggleSelectAllOnPage}
          onClearSelection={clearSelection}
          onPublishSelected={() => bulkSetSelected('published')}
          onUnpublishSelected={() => bulkSetSelected('unpublished')}
          onDeleteSelected={() => setBulkDeleteOpen(true)}
          onPublishAll={() => bulkStatus.mutate({ status: 'published' }, { onSuccess: clearSelection })}
          onUnpublishAll={() => bulkStatus.mutate({ status: 'unpublished' }, { onSuccess: clearSelection })}
          onCopyAllLinks={copyAllLinks}
          copied={copiedAll}
          isBusy={isBusy}
        />
      )}

      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Spinner />
        </div>
      )}

      {!isLoading && !hasRecipients && !search && (
        <EmptyState
          accent="green"
          icon={<Users size={24} color={BRAND.green} />}
          title="No users have access yet"
          subtitle="Add a user to create their own private link to this booklet."
          action={{ label: 'Add user', onClick: () => setAddOpen(true) }}
        />
      )}

      {!isLoading && recipients.length === 0 && search && (
        <EmptyState
          accent="green"
          icon={<Search size={24} color={BRAND.green} />}
          title="No matching users"
          subtitle={`No user matches "${search}". Try a different name.`}
        />
      )}

      {recipients.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {recipients.map((recipient) => (
            <RecipientRow
              key={recipient.id}
              recipient={recipient}
              isBusy={isBusy}
              selected={selectedIds.has(recipient.id)}
              onToggleSelect={() => toggleSelect(recipient.id)}
              onSetStatus={(status) => updateStatus.mutate({ id: recipient.id, status })}
              onSetExpiry={(expiresAt) => updateExpiry.mutate({ id: recipient.id, expiresAt })}
              onRotate={() => rotateToken.mutate(recipient.id)}
              onDelete={() => setDeleteTarget(recipient)}
            />
          ))}
        </div>
      )}

      <RecipientPager page={page} total={total} onPageChange={setPage} />

      <AddRecipientDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        isPending={addRecipient.isPending}
        onAdd={async (name, expiresAt) => {
          // A create-time expiry starts the link Published (README: "setting it
          // starts the link Published"); without one it defaults to unpublished.
          await addRecipient.mutateAsync(
            expiresAt ? { name, expiresAt, status: 'published' } : { name },
          );
        }}
      />

      {/* Single-row delete confirmation — a handed-out link is permanently
          destroyed, so guard it like the booklet delete (BookletListPage). */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove user?</DialogTitle>
            <DialogDescription>
              This permanently removes <strong>"{deleteTarget?.name}"</strong> and their link. Anyone
              still holding that link will no longer be able to open the booklet. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirmation — same guard, for the checkbox selection. */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {selectedList.length} users?</DialogTitle>
            <DialogDescription>
              This permanently removes the selected users and their links. Anyone still holding those
              links will no longer be able to open the booklet. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmBulkDelete}>
              Remove {selectedList.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
