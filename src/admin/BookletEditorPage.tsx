import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Pencil } from 'lucide-react';
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
  useBookletDetailQuery,
  useUpdateBookletStatusMutation,
  useUpdateBookletTitleMutation,
} from '@/hooks/useBookletQuery';
import {
  useAddPageMutation,
  useDeletePageMutation,
  useReorderPagesMutation,
  useSetQuizPageMutation,
} from '@/hooks/usePagesQuery';
import { PageElementEditor } from '@/admin/editor/PageElementEditor';
import { PagesSidebar } from '@/admin/editor/PagesSidebar';
import { QuizEmbedEditor } from '@/admin/editor/QuizEmbedEditor';
import type { SaveStatus } from '@/admin/editor/useAutosave';
import type { PageRow } from '@/types/database';
import { BRAND } from '@/config/theme';

const ROOT_STYLE: CSSProperties = {
  position: 'relative',
  height: '100vh',
  overflow: 'hidden',
  backgroundColor: BRAND.green,
  display: 'flex',
  flexDirection: 'column',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
};

// Decorative paper-cut background shapes — same visual language as all other
// admin pages (MediaLibraryPicker, FontManagerPage, DashboardPage, etc.).
function BgShapes() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <div style={{ position: 'absolute', width: 460, height: 460, borderRadius: '50%', top: -140, right: -100, backgroundColor: BRAND.yellow, opacity: 0.26, boxShadow: '8px 10px 0 rgba(0,0,0,0.06)' }} />
      <div style={{ position: 'absolute', width: 380, height: 190, borderRadius: 100, bottom: -70, left: -90, backgroundColor: BRAND.cream, opacity: 0.2, boxShadow: '6px 8px 0 rgba(0,0,0,0.05)' }} />
      <div style={{ position: 'absolute', width: 240, height: 240, borderRadius: '50%', top: '42%', left: -80, backgroundColor: BRAND.pink, opacity: 0.16, boxShadow: '6px 8px 0 rgba(0,0,0,0.06)' }} />
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', bottom: -70, right: -50, backgroundColor: '#3d9b7a', opacity: 0.2, boxShadow: '6px 8px 0 rgba(0,0,0,0.06)' }} />
      <div style={{ position: 'absolute', width: 160, height: 260, borderRadius: 48, top: 50, left: '30%', backgroundColor: BRAND.cream, opacity: 0.08 }} />
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  if (status === 'saving')
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: BRAND.textMuted }}>
        <Spinner size="sm" />
        Saving…
      </span>
    );
  if (status === 'saved')
    return <span style={{ fontSize: 12, fontWeight: 600, color: BRAND.green }}>✓ Saved</span>;
  return <span style={{ fontSize: 12, fontWeight: 600, color: BRAND.pink }}>Save failed</span>;
}

// Inline-editable booklet title in the header. Click the title (or its pencil)
// to edit; Enter/blur commits, Escape cancels. Title is admin-facing only, so
// this is a plain explicit save — no autosave/undo plumbing like page_elements.
function EditableTitle({
  title,
  onSave,
}: {
  title: string;
  onSave: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [hover, setHover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    const next = draft.trim();
    if (next && next !== title) onSave(next);
    setEditing(false);
  }

  function cancel() {
    setDraft(title);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          else if (e.key === 'Escape') cancel();
        }}
        aria-label="Booklet title"
        style={{
          margin: 0,
          flex: 1,
          minWidth: 0,
          fontSize: 15,
          fontWeight: 700,
          color: BRAND.text,
          fontFamily: 'inherit',
          backgroundColor: '#fff',
          border: `2px solid ${BRAND.green}`,
          borderRadius: 8,
          padding: '3px 8px',
          outline: 'none',
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(title);
        setEditing(true);
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Rename booklet"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        minWidth: 0,
        border: 'none',
        background: hover ? 'rgba(0,0,0,0.05)' : 'transparent',
        borderRadius: 8,
        padding: '3px 8px',
        margin: '0 -8px',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        transition: 'background-color 0.16s',
      }}
    >
      <span style={{
        margin: 0, fontSize: 15, fontWeight: 700, color: BRAND.text,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {title}
      </span>
      <Pencil size={13} color={BRAND.textMuted} style={{ flexShrink: 0, opacity: hover ? 1 : 0.5, transition: 'opacity 0.16s' }} />
    </button>
  );
}

export function BookletEditorPage() {
  const { bookletId, pageId } = useParams<{ bookletId: string; pageId?: string }>();
  const navigate = useNavigate();
  const { data: booklet, isLoading } = useBookletDetailQuery(bookletId);
  const updateStatus = useUpdateBookletStatusMutation();
  const updateTitle = useUpdateBookletTitleMutation();

  const addPage = useAddPageMutation(bookletId ?? '');
  const deletePage = useDeletePageMutation(bookletId ?? '');
  const reorderPages = useReorderPagesMutation(bookletId ?? '');
  const setQuizPage = useSetQuizPageMutation(bookletId ?? '');

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [deletePageTarget, setDeletePageTarget] = useState<PageRow | null>(null);
  const [showQuizEditor, setShowQuizEditor] = useState(false);
  const [backHover, setBackHover] = useState(false);
  const [publishHover, setPublishHover] = useState(false);
  const [quizHover, setQuizHover] = useState(false);

  if (isLoading) {
    return (
      <div id="admin-root" style={ROOT_STYLE}>
        <BgShapes />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Spinner />
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>Loading booklet…</span>
        </div>
      </div>
    );
  }

  if (!booklet) {
    return (
      <div id="admin-root" style={ROOT_STYLE}>
        <BgShapes />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={24} color="rgba(255,255,255,0.7)" />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, margin: 0 }}>This booklet could not be found.</p>
          <Link to="/admin/booklets" style={{ color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>← Back to booklets</Link>
        </div>
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
    <div id="admin-root" style={ROOT_STYLE}>
      <BgShapes />

      {/* Content layer above background shapes */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* ── Floating header card ─────────────────────────────────────────── */}
        <header style={{
          margin: '14px 20px 0',
          backgroundColor: BRAND.cream,
          borderRadius: 20,
          padding: '11px 18px',
          boxShadow: '0 8px 28px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}>
          {/* Back button */}
          <Link
            to="/admin/booklets"
            aria-label="Back to booklets"
            onMouseEnter={() => setBackHover(true)}
            onMouseLeave={() => setBackHover(false)}
            style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              backgroundColor: backHover ? 'rgba(89,178,146,0.18)' : 'rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: BRAND.text, textDecoration: 'none',
              transition: 'background-color 0.16s',
            }}
          >
            <ArrowLeft size={16} />
          </Link>

          <div style={{ width: 1, height: 22, backgroundColor: 'rgba(0,0,0,0.1)', flexShrink: 0 }} />

          {/* Title (inline-editable) + status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <EditableTitle
              title={booklet.title}
              onSave={(next) => updateTitle.mutate({ id: booklet.id, title: next })}
            />
            <StatusBadge status={booklet.status} />
          </div>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <SaveIndicator status={saveStatus} />

            {booklet.status === 'draft' && (
              <button
                type="button"
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ id: booklet.id, status: 'published' })}
                onMouseEnter={() => setPublishHover(true)}
                onMouseLeave={() => setPublishHover(false)}
                style={{
                  border: 'none', borderRadius: 12, padding: '7px 18px',
                  fontSize: 13, fontWeight: 700, cursor: updateStatus.isPending ? 'not-allowed' : 'pointer',
                  backgroundColor: publishHover && !updateStatus.isPending ? BRAND.yellowDark : BRAND.yellow,
                  color: BRAND.text, fontFamily: 'inherit',
                  transition: 'background-color 0.16s',
                  opacity: updateStatus.isPending ? 0.6 : 1,
                }}
              >
                Publish
              </button>
            )}
            {booklet.status === 'published' && (
              <button
                type="button"
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ id: booklet.id, status: 'draft' })}
                onMouseEnter={() => setPublishHover(true)}
                onMouseLeave={() => setPublishHover(false)}
                style={{
                  border: '1.5px solid rgba(0,0,0,0.15)', borderRadius: 12, padding: '6px 18px',
                  fontSize: 13, fontWeight: 700, cursor: updateStatus.isPending ? 'not-allowed' : 'pointer',
                  backgroundColor: publishHover && !updateStatus.isPending ? 'rgba(0,0,0,0.07)' : 'transparent',
                  color: BRAND.text, fontFamily: 'inherit',
                  transition: 'background-color 0.16s',
                  opacity: updateStatus.isPending ? 0.6 : 1,
                }}
              >
                Unpublish
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowQuizEditor(true)}
              onMouseEnter={() => setQuizHover(true)}
              onMouseLeave={() => setQuizHover(false)}
              style={{
                border: 'none', borderRadius: 12, padding: '7px 16px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                backgroundColor: quizHover ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.05)',
                color: BRAND.text, fontFamily: 'inherit',
                transition: 'background-color 0.16s',
              }}
            >
              Quiz
            </button>
          </div>
        </header>

        {/* ── 3-column body ───────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden',
          gap: 12, padding: '12px 20px 16px',
        }}>
          {/* Left: page thumbnails sidebar */}
          <PagesSidebar
            bookletId={booklet.id}
            pages={pages}
            selectedPageId={pageId}
            isAddingPage={addPage.isPending}
            onDeletePage={(page) => setDeletePageTarget(page)}
            onReorderPages={(ids) => reorderPages.mutate(ids)}
            onAddPage={() => {
              addPage.mutate(undefined, {
                onSuccess: (newPage) => {
                  navigate(`/admin/booklets/${bookletId}/pages/${newPage.id}`);
                },
              });
            }}
          />

          {/* Center + right: canvas + inspector */}
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            {!pageId ? (
              <div style={{
                display: 'flex', height: '100%', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center',
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 22,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <BookOpen size={28} color="rgba(255,255,255,0.85)" />
                </div>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, margin: 0 }}>
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
      </div>

      {/* ── Quiz embed dialog ────────────────────────────────────────────── */}
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

      {/* ── Delete page confirmation dialog ─────────────────────────────── */}
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
