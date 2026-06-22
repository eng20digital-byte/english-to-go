import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import {
  useBookletsQuery,
  useCreateBookletMutation,
  useDeleteBookletMutation,
  useUpdateBookletStatusMutation,
} from '@/hooks/useBookletQuery';
import type { BookletRow } from '@/types/database';

function readerUrl(token: string): string {
  return `${window.location.origin}/b/${token}`;
}

interface BookletActionsProps {
  booklet: BookletRow;
  onPublish: () => void;
  onUnpublish: () => void;
  onDisable: () => void;
  onReenable: () => void;
  onDelete: () => void;
  isUpdating: boolean;
}

// Action set depends on status — see CLAUDE.md "No draft/live content fork"
// for why disable/re-enable is a separate, asymmetric-risk action from the
// plain draft<->published toggle (re-enable restores access at an
// already-known link, so it alone requires confirmation).
function BookletActions({
  booklet,
  onPublish,
  onUnpublish,
  onDisable,
  onReenable,
  onDelete,
  isUpdating,
}: BookletActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm">
        <Link to={`/admin/booklets/${booklet.id}`}>Open</Link>
      </Button>
      {booklet.status === 'draft' && (
        <Button size="sm" disabled={isUpdating} onClick={onPublish}>
          Publish
        </Button>
      )}
      {booklet.status === 'published' && (
        <>
          <Button size="sm" variant="outline" disabled={isUpdating} onClick={onUnpublish}>
            Unpublish
          </Button>
          <Button size="sm" variant="destructive" disabled={isUpdating} onClick={onDisable}>
            Disable
          </Button>
        </>
      )}
      {booklet.status === 'disabled' && (
        <Button size="sm" disabled={isUpdating} onClick={onReenable}>
          Re-enable
        </Button>
      )}
      <Button size="sm" variant="destructive" disabled={isUpdating} onClick={onDelete}>
        Delete
      </Button>
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

  function handleDelete(booklet: BookletRow) {
    if (
      !window.confirm(
        `Delete "${booklet.title}"? This permanently removes all its pages and content.`,
      )
    ) {
      return;
    }
    deleteBooklet.mutate(booklet.id);
  }

  function handleReenable(booklet: BookletRow) {
    if (!window.confirm('This restores public access at the existing link. Continue?')) {
      return;
    }
    updateStatus.mutate({ id: booklet.id, status: 'published' });
  }

  return (
    <div id="admin-root" className="p-8">
      <Link to="/admin" className="text-sm text-muted-foreground hover:underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 mb-4 text-xl font-semibold">Booklets</h1>

      <form onSubmit={handleSubmit} className="mb-8 flex max-w-sm flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span>Title</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="My English Booklet"
            required
            className="rounded-md border border-input px-3 py-2"
          />
        </label>
        {formError && <p className="text-sm text-destructive">{formError}</p>}
        <Button type="submit" disabled={createBooklet.isPending}>
          {createBooklet.isPending ? 'Creating…' : 'Create booklet'}
        </Button>
      </form>

      {isLoading && <p>Loading…</p>}
      {!isLoading && booklets?.length === 0 && (
        <p className="text-muted-foreground">No booklets yet.</p>
      )}
      <ul className="flex flex-col gap-4">
        {booklets?.map((booklet) => (
          <li key={booklet.id} className="rounded-md border border-input p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{booklet.title}</p>
              <StatusBadge status={booklet.status} />
            </div>
            <p className="mb-3 text-xs text-muted-foreground break-all">
              {readerUrl(booklet.public_token)}
            </p>
            <BookletActions
              booklet={booklet}
              isUpdating={updateStatus.isPending}
              onPublish={() => updateStatus.mutate({ id: booklet.id, status: 'published' })}
              onUnpublish={() => updateStatus.mutate({ id: booklet.id, status: 'draft' })}
              onDisable={() => updateStatus.mutate({ id: booklet.id, status: 'disabled' })}
              onReenable={() => handleReenable(booklet)}
              onDelete={() => handleDelete(booklet)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
