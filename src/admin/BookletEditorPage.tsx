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
  useUpdateBookletBackgroundColorMutation,
  useUpdateBookletStatusMutation,
  useUpdateBookletTitleMutation,
} from '@/hooks/useBookletQuery';
import {
  useAddCoverPageMutation,
  useAddPageMutation,
  useDeletePageMutation,
  useDuplicatePageMutation,
  usePastePageMutation,
  useReorderPagesMutation,
  useSetQuizPageMutation,
} from '@/hooks/usePagesQuery';
import { fetchPageElements } from '@/hooks/usePageElementsQuery';
import { PageElementEditor } from '@/admin/editor/PageElementEditor';
import { PagesSidebar } from '@/admin/editor/PagesSidebar';
import { QuizEmbedEditor } from '@/admin/editor/QuizEmbedEditor';
import { useElementClipboard } from '@/admin/editor/clipboard/useElementClipboard';
import { usePageClipboard } from '@/admin/editor/clipboard/usePageClipboard';
import type { SaveStatus } from '@/admin/editor/useAutosave';
import type { PageRow } from '@/types/database';
import { BRAND } from '@/config/theme';
import { CANVAS_BACKGROUND_COLOR } from '@/config/canvas';

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

// Booklet-level page-canvas background color picker, shown in the editor header.
// Mirrors EditableTitle's local-draft model: `onPreview` updates the live color
// across the whole editor (canvas + thumbnails) as the native picker is dragged;
// `onCommit` (picker blur) persists it once, so a single pick is one DB write
// rather than one per drag step. A custom swatch sits over a visually-hidden
// <input type="color"> — clicking the label forwards to the input and opens the
// OS color picker, which is anchored next to the swatch.
function BackgroundColorControl({
  value,
  onPreview,
  onCommit,
}: {
  value: string;
  onPreview: (color: string) => void;
  onCommit: (color: string) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <label
      title="Booklet background color"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderRadius: 12,
        padding: '6px 12px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        backgroundColor: hover ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.05)',
        color: BRAND.text,
        transition: 'background-color 0.16s',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 18,
          height: 18,
          borderRadius: 6,
          flexShrink: 0,
          backgroundColor: value,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)',
        }}
      />
      <span>Background</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onPreview(e.target.value)}
        onBlur={(e) => onCommit(e.target.value)}
        aria-label="Booklet background color"
        style={{
          position: 'absolute',
          left: 12,
          bottom: 4,
          width: 1,
          height: 1,
          opacity: 0,
          border: 'none',
          padding: 0,
          pointerEvents: 'none',
        }}
      />
    </label>
  );
}

export function BookletEditorPage() {
  const { bookletId, pageId } = useParams<{ bookletId: string; pageId?: string }>();
  const navigate = useNavigate();
  const { data: booklet, isLoading } = useBookletDetailQuery(bookletId);
  const updateStatus = useUpdateBookletStatusMutation();
  const updateTitle = useUpdateBookletTitleMutation();
  const updateBackgroundColor = useUpdateBookletBackgroundColorMutation();

  const addPage = useAddPageMutation(bookletId ?? '');
  const addCoverPage = useAddCoverPageMutation(bookletId ?? '');
  const deletePage = useDeletePageMutation(bookletId ?? '');
  const duplicatePage = useDuplicatePageMutation(bookletId ?? '');
  const pastePage = usePastePageMutation(bookletId ?? '');
  const reorderPages = useReorderPagesMutation(bookletId ?? '');
  const setQuizPage = useSetQuizPageMutation(bookletId ?? '');

  // Editor-wide clipboards. Owned here (not inside PageElementEditor, which
  // remounts per page) so a copy survives page navigation — the whole point of
  // a "global" clipboard. PageElementEditor receives the element clipboard;
  // page ops below use the page clipboard directly.
  const elementClipboard = useElementClipboard();
  const pageClipboard = usePageClipboard();
  // The open page parks its "flush pending autosave" callback here so page-level
  // copy/cut/duplicate of that page persist before we read its elements back.
  const flushRef = useRef<(() => Promise<void>) | null>(null);
  // Latest page-shortcut handler, reassigned each render with fresh closures so
  // the window listener (registered once below) always runs current logic.
  const pageShortcutRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [deletePageTarget, setDeletePageTarget] = useState<PageRow | null>(null);

  // Live page-canvas background color. Sourced from the booklet's stored value
  // but held as a local draft so the color picker previews instantly across the
  // whole editor (canvas + every thumbnail) while dragging, before the
  // commit-on-blur persists it. Re-synced via the render-phase "adjust state on
  // prop change" pattern (same as ReaderBookletPage's coverState reset) whenever
  // the stored value changes — our own save's refetch, or an external update.
  const persistedBgColor = booklet?.background_color ?? CANVAS_BACKGROUND_COLOR;
  const [bgColor, setBgColor] = useState(persistedBgColor);
  const [prevPersistedBgColor, setPrevPersistedBgColor] = useState(persistedBgColor);
  if (persistedBgColor !== prevPersistedBgColor) {
    setPrevPersistedBgColor(persistedBgColor);
    setBgColor(persistedBgColor);
  }
  const [showQuizEditor, setShowQuizEditor] = useState(false);
  const [backHover, setBackHover] = useState(false);
  const [publishHover, setPublishHover] = useState(false);
  const [quizHover, setQuizHover] = useState(false);

  // ── Page data + operations. Derived before the early returns so the
  // keyboard-shortcut hooks below keep a stable call order; safe before the
  // booklet has loaded (pages is empty and the handlers simply aren't invoked).
  const pages = booklet?.pages ?? [];
  const bookletPath = booklet ? `/admin/booklets/${booklet.id}` : '';
  const currentPage = pages.find((page) => page.id === pageId) ?? null;
  const hasCover = pages.some((page) => page.is_cover);

  function goToPage(targetPageId: string) {
    navigate(`${bookletPath}/pages/${targetPageId}`);
  }

  // After removing a page, select its previous sibling (or next, or the empty
  // state) so the editor never lingers on a route whose page no longer exists.
  function selectNeighborOf(removed: PageRow) {
    const index = pages.findIndex((page) => page.id === removed.id);
    const neighbor = pages[index - 1] ?? pages[index + 1] ?? null;
    navigate(neighbor ? `${bookletPath}/pages/${neighbor.id}` : bookletPath);
  }

  // Flush the open page's pending edits before reading a page's elements back
  // from the DB, but only when the target IS the open page (others have no live
  // in-memory state — the DB is already authoritative for them).
  async function flushIfOpen(page: PageRow) {
    if (page.id === pageId) await flushRef.current?.();
  }

  async function handleDuplicatePage(page: PageRow) {
    await flushIfOpen(page);
    const newPage = await duplicatePage.mutateAsync(page.id);
    goToPage(newPage.id);
  }

  async function handleCopyPage(page: PageRow) {
    await flushIfOpen(page);
    const elements = await fetchPageElements(page.id);
    pageClipboard.copy({ elements, isQuizPage: page.is_quiz_page });
  }

  async function handleCutPage(page: PageRow) {
    await flushIfOpen(page);
    // Capture before deleting so Paste Page can restore it (cut == copy + remove).
    const elements = await fetchPageElements(page.id);
    pageClipboard.copy({ elements, isQuizPage: page.is_quiz_page });
    await deletePage.mutateAsync(page.id);
    if (pageId === page.id) selectNeighborOf(page);
  }

  async function handlePastePage(afterPage: PageRow | null) {
    const data = pageClipboard.data;
    if (!data) return;
    const after = afterPage ?? currentPage ?? pages[pages.length - 1] ?? null;
    const newPage = await pastePage.mutateAsync({
      afterPageId: after?.id ?? null,
      isQuizPage: data.isQuizPage,
      elements: data.elements,
    });
    goToPage(newPage.id);
  }

  async function handleDeletePage(page: PageRow) {
    await deletePage.mutateAsync(page.id);
    if (pageId === page.id) selectNeighborOf(page);
    setDeletePageTarget(null);
  }

  // Page-level keyboard shortcuts (Ctrl+Shift+C/X/V/D/Delete). Ctrl+Shift only,
  // and ignored while a text field is focused so it never disrupts text editing
  // (or collides with the element-level plain-Ctrl shortcuts in the editor).
  function handlePageShortcut(e: KeyboardEvent) {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl || !e.shiftKey) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    // Clipboard ops don't apply to the cover (it's pinned first and unique) —
    // only Delete does, mirroring the cover's action menu.
    if (e.code === 'KeyC' && currentPage && !currentPage.is_cover) {
      e.preventDefault();
      void handleCopyPage(currentPage);
    } else if (e.code === 'KeyX' && currentPage && !currentPage.is_cover) {
      e.preventDefault();
      void handleCutPage(currentPage);
    } else if (e.code === 'KeyV' && pageClipboard.hasPage && currentPage && !currentPage.is_cover) {
      e.preventDefault();
      void handlePastePage(currentPage);
    } else if (e.code === 'KeyD' && currentPage && !currentPage.is_cover) {
      e.preventDefault();
      void handleDuplicatePage(currentPage);
    } else if (e.key === 'Delete' && currentPage) {
      e.preventDefault();
      setDeletePageTarget(currentPage);
    }
  }

  // Keep the ref pointing at the latest closure (assigning a ref during render
  // is disallowed; an effect is timely enough since key events fire after
  // commit), then register the window listener once, delegating through it.
  useEffect(() => {
    pageShortcutRef.current = handlePageShortcut;
  });
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      pageShortcutRef.current?.(e);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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

  const lastPage = pages[pages.length - 1];

  return (
    // Editor workspace backdrop reflects the booklet's reader background live, so
    // picking a color previews exactly what the reader will show (the cream cards
    // and canvas float on top, same as the reader chrome floats on its backdrop).
    <div id="admin-root" style={{ ...ROOT_STYLE, backgroundColor: bgColor }}>
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

            <BackgroundColorControl
              value={bgColor}
              onPreview={setBgColor}
              onCommit={(color) => {
                if (color !== booklet.background_color) {
                  updateBackgroundColor.mutate({ id: booklet.id, backgroundColor: color });
                }
              }}
            />

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
            isAddingCover={addCoverPage.isPending}
            hasCover={hasCover}
            hasPageClipboard={pageClipboard.hasPage}
            onAddCover={() => {
              addCoverPage.mutate(undefined, {
                onSuccess: (newPage) => {
                  navigate(`/admin/booklets/${bookletId}/pages/${newPage.id}`);
                },
              });
            }}
            onDeletePage={(page) => setDeletePageTarget(page)}
            onDuplicatePage={(page) => void handleDuplicatePage(page)}
            onCopyPage={(page) => void handleCopyPage(page)}
            onCutPage={(page) => void handleCutPage(page)}
            onPastePage={(afterPage) => void handlePastePage(afterPage)}
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
                isCover={currentPage?.is_cover ?? false}
                elementClipboard={elementClipboard}
                flushRef={flushRef}
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
