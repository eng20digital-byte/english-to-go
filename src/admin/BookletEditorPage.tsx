import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/Spinner';
import { StatusBadge } from '@/components/StatusBadge';
import { useBookletDetailQuery } from '@/hooks/useBookletQuery';
import {
  useAddPageMutation,
  useDeletePageMutation,
  useReorderPagesMutation,
  useSetQuizPageMutation,
} from '@/hooks/usePagesQuery';
import { PageElementEditor } from '@/admin/editor/PageElementEditor';
import { QuizEmbedEditor } from '@/admin/editor/QuizEmbedEditor';
import type { PageRow } from '@/types/database';

interface PageRowItemProps {
  page: PageRow;
  index: number;
  pageCount: number;
  isLast: boolean;
  isSelected: boolean;
  bookletId: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onToggleQuizPage: (next: boolean) => void;
  isReordering: boolean;
}

function PageRowItem({
  page,
  index,
  pageCount,
  isLast,
  isSelected,
  bookletId,
  onMoveUp,
  onMoveDown,
  onDelete,
  onToggleQuizPage,
  isReordering,
}: PageRowItemProps) {
  return (
    <li
      className={`flex flex-wrap items-center gap-3 rounded-md border p-3 ${
        isSelected ? 'border-primary' : 'border-input'
      }`}
    >
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={index === 0 || isReordering}
          onClick={onMoveUp}
          aria-label="Move page up"
        >
          ↑
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={index === pageCount - 1 || isReordering}
          onClick={onMoveDown}
          aria-label="Move page down"
        >
          ↓
        </Button>
      </div>

      <Link
        to={`/admin/booklets/${bookletId}/pages/${page.id}`}
        className="flex-1 text-sm font-medium hover:underline"
      >
        Page {index + 1}
        {page.is_quiz_page && (
          <span className="ml-2 text-xs text-muted-foreground">(quiz page)</span>
        )}
      </Link>

      {isLast && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={page.is_quiz_page}
            onChange={(event) => onToggleQuizPage(event.target.checked)}
          />
          Quiz page
        </label>
      )}

      <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
        Delete
      </Button>
    </li>
  );
}

export function BookletEditorPage() {
  const { bookletId, pageId } = useParams<{ bookletId: string; pageId?: string }>();
  const navigate = useNavigate();
  const { data: booklet, isLoading } = useBookletDetailQuery(bookletId);

  const addPage = useAddPageMutation(bookletId ?? '');
  const deletePage = useDeletePageMutation(bookletId ?? '');
  const reorderPages = useReorderPagesMutation(bookletId ?? '');
  const setQuizPage = useSetQuizPageMutation(bookletId ?? '');

  if (isLoading) {
    return (
      <div id="admin-root" className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          <span>Loading booklet…</span>
        </div>
      </div>
    );
  }

  if (!booklet) {
    return (
      <div id="admin-root" className="p-8">
        <Link to="/admin/booklets" className="text-sm text-muted-foreground hover:underline">
          ← Back to booklets
        </Link>
        <p className="mt-4">This booklet could not be found.</p>
      </div>
    );
  }

  const pages = booklet.pages;
  const lastIndex = pages.length - 1;

  function movePage(fromIndex: number, toIndex: number) {
    const reordered = [...pages];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    reorderPages.mutate(reordered.map((page) => page.id));
  }

  async function handleDeletePage(page: PageRow, index: number) {
    if (!window.confirm(`Delete page ${index + 1}? This cannot be undone.`)) {
      return;
    }
    await deletePage.mutateAsync(page.id);
    if (pageId === page.id) {
      navigate(`/admin/booklets/${bookletId}`);
    }
  }

  return (
    <div id="admin-root" className="p-8">
      <Link to="/admin/booklets" className="text-sm text-muted-foreground hover:underline">
        ← Back to booklets
      </Link>
      <div className="mt-2 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{booklet.title}</h1>
        <StatusBadge status={booklet.status} />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pages</h2>
        <Button type="button" disabled={addPage.isPending} onClick={() => addPage.mutate()}>
          {addPage.isPending ? 'Adding…' : 'Add page'}
        </Button>
      </div>

      {pages.length === 0 && <p className="text-muted-foreground">No pages yet.</p>}

      <ul className="flex flex-col gap-2">
        {pages.map((page, index) => (
          <PageRowItem
            key={page.id}
            page={page}
            index={index}
            pageCount={pages.length}
            isLast={index === lastIndex}
            isSelected={pageId === page.id}
            bookletId={booklet.id}
            isReordering={reorderPages.isPending}
            onMoveUp={() => movePage(index, index - 1)}
            onMoveDown={() => movePage(index, index + 1)}
            onDelete={() => handleDeletePage(page, index)}
            onToggleQuizPage={(next) => setQuizPage.mutate({ pageId: page.id, isQuizPage: next })}
          />
        ))}
      </ul>

      <QuizEmbedEditor booklet={booklet} />

      {/* Keyed by pageId so switching pages remounts the editor — a fresh
          reducer/selection/undo-stack per page rather than one that's been
          reset out from under a still-mounted component. */}
      {pageId && <PageElementEditor key={pageId} pageId={pageId} />}
    </div>
  );
}
