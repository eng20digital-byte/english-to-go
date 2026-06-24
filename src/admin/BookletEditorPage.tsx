import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
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
import { useBookletDetailQuery, useUpdateBookletStatusMutation } from '@/hooks/useBookletQuery';
import {
  useAddPageMutation,
  useDeletePageMutation,
  useSetQuizPageMutation,
} from '@/hooks/usePagesQuery';
import { PageElementEditor } from '@/admin/editor/PageElementEditor';
import { PagesSidebar } from '@/admin/editor/PagesSidebar';
import { QuizEmbedEditor } from '@/admin/editor/QuizEmbedEditor';
import type { SaveStatus } from '@/admin/editor/useAutosave';
import type { PageRow } from '@/types/database';

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  if (status === 'saving')
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Spinner size="sm" />
        Saving…
      </span>
    );
  if (status === 'saved')
    return <span className="text-xs text-muted-foreground">Saved</span>;
  return <span className="text-xs text-destructive">Save failed</span>;
}

export function BookletEditorPage() {
  const { bookletId, pageId } = useParams<{ bookletId: string; pageId?: string }>();
  const navigate = useNavigate();
  const { data: booklet, isLoading } = useBookletDetailQuery(bookletId);
  const updateStatus = useUpdateBookletStatusMutation();

  const addPage = useAddPageMutation(bookletId ?? '');
  const deletePage = useDeletePageMutation(bookletId ?? '');
  const setQuizPage = useSetQuizPageMutation(bookletId ?? '');

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [deletePageTarget, setDeletePageTarget] = useState<PageRow | null>(null);
  const [showQuizEditor, setShowQuizEditor] = useState(false);

  if (isLoading) {
    return (
      <div id="admin-root" className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          <span>Loading booklet…</span>
        </div>
      </div>
    );
  }

  if (!booklet) {
    return (
      <div id="admin-root" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <BookOpen className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-muted-foreground">This booklet could not be found.</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/booklets">← Back to booklets</Link>
        </Button>
      </div>
    );
  }

  const pages = booklet.pages;

  async function handleDeletePage(page: PageRow) {
    await deletePage.mutateAsync(page.id);
    if (pageId === page.id) {
      navigate(`/admin/booklets/${bookletId}`);
    }
    setDeletePageTarget(null);
  }

  const lastPage = pages[pages.length - 1];

  return (
    <div
      id="admin-root"
      className="flex h-screen flex-col overflow-hidden bg-background"
    >
      {/* ── Top header bar ────────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-2.5 shadow-[var(--shadow-card)]">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <Link to="/admin/booklets" aria-label="Back to booklets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="truncate text-sm font-semibold">{booklet.title}</h1>
          <StatusBadge status={booklet.status} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <SaveIndicator status={saveStatus} />

          {/* Publish / unpublish toggle */}
          {booklet.status === 'draft' && (
            <Button
              size="sm"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ id: booklet.id, status: 'published' })}
            >
              Publish
            </Button>
          )}
          {booklet.status === 'published' && (
            <Button
              size="sm"
              variant="outline"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ id: booklet.id, status: 'draft' })}
            >
              Unpublish
            </Button>
          )}

          {/* Quiz embed */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowQuizEditor(true)}
          >
            Quiz
          </Button>
        </div>
      </header>

      {/* ── 3-column body ─────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left: page thumbnails */}
        <PagesSidebar
          bookletId={booklet.id}
          pages={pages}
          selectedPageId={pageId}
          isAddingPage={addPage.isPending}
          onDeletePage={(page) => setDeletePageTarget(page)}
          onAddPage={() => {
            addPage.mutate(undefined, {
              onSuccess: (newPage) => {
                navigate(`/admin/booklets/${bookletId}/pages/${newPage.id}`);
              },
            });
          }}
        />

        {/* Center + right: canvas + inspector (inside PageElementEditor) */}
        <div className="min-w-0 flex-1 overflow-hidden">
          {!pageId ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Select a page from the sidebar to start editing.
              </p>
            </div>
          ) : (
            // Keyed by pageId so switching pages remounts the editor — a fresh
            // reducer/selection/undo-stack per page rather than one that's been
            // reset out from under a still-mounted component.
            <PageElementEditor
              key={pageId}
              pageId={pageId}
              onSaveStatusChange={setSaveStatus}
            />
          )}
        </div>
      </div>

      {/* Quiz embed dialog */}
      <Dialog open={showQuizEditor} onOpenChange={setShowQuizEditor}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Quiz Embed</DialogTitle>
          </DialogHeader>
          <QuizEmbedEditor booklet={booklet} />
          {lastPage && (
            <div className="mt-2 border-t border-border pt-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={lastPage.is_quiz_page}
                  onChange={(e) =>
                    setQuizPage.mutate({ pageId: lastPage.id, isQuizPage: e.target.checked })
                  }
                />
                <span>Show quiz on last page</span>
              </label>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete page confirmation dialog */}
      <Dialog
        open={!!deletePageTarget}
        onOpenChange={(open) => !open && setDeletePageTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete page?</DialogTitle>
            <DialogDescription>
              This permanently removes the page and all its elements. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePageTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletePageTarget && handleDeletePage(deletePageTarget)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
