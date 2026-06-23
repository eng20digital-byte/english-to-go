import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/Spinner';
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

// Three placeholder cards that mimic the shape of a real booklet list item.
function BookletListSkeleton() {
  return (
    <ul className="flex flex-col gap-4">
      {[0, 1, 2].map((i) => (
        <li key={i} className="rounded-md border border-input p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-4 w-40 animate-pulse rounded bg-neutral-200" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-neutral-200" />
          </div>
          <div className="mb-3 h-3 w-64 animate-pulse rounded bg-neutral-100" />
          <div className="flex gap-2">
            <div className="h-8 w-16 animate-pulse rounded-md bg-neutral-100" />
            <div className="h-8 w-20 animate-pulse rounded-md bg-neutral-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyBooklets() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
        <BookOpen className="h-5 w-5 text-neutral-400" />
      </div>
      <div>
        <p className="font-medium text-neutral-700">No booklets yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first booklet using the form above.
        </p>
      </div>
    </div>
  );
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
      <h1 className="mt-2 mb-6 text-xl font-semibold">Booklets</h1>

      <form onSubmit={handleSubmit} className="mb-8 flex max-w-sm flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Title</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="My English Booklet"
            required
            className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        {formError && <p className="text-sm text-destructive">{formError}</p>}
        <Button type="submit" disabled={createBooklet.isPending} className="self-start">
          {createBooklet.isPending ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" className="text-primary-foreground" />
              Creating…
            </span>
          ) : (
            'Create booklet'
          )}
        </Button>
      </form>

      {isLoading && <BookletListSkeleton />}
      {!isLoading && booklets?.length === 0 && <EmptyBooklets />}

      <ul className="flex flex-col gap-4">
        {booklets?.map((booklet) => (
          <li
            key={booklet.id}
            className="rounded-md border border-input p-4 transition-shadow hover:shadow-sm"
          >
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
