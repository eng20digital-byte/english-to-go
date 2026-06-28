import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookImage,
  ClipboardPaste,
  Copy,
  CopyPlus,
  MoreVertical,
  Plus,
  Scissors,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  // DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/Spinner';
import { PageThumbnail } from './PageThumbnail';
import type { PageRow } from '@/types/database';
import { BRAND } from '@/config/theme';

interface PagesSidebarProps {
  bookletId: string;
  pages: PageRow[];
  selectedPageId: string | undefined;
  isAddingPage: boolean;
  isAddingCover: boolean;
  // Whether the booklet already has a front cover — hides "Add Cover" when true
  // (≤1 cover per booklet, enforced server-side too).
  hasCover: boolean;
  // Enables the "Paste page" item — true once a page has been copied/cut.
  hasPageClipboard: boolean;
  onAddPage: () => void;
  onAddCover: () => void;
  onDeletePage: (page: PageRow) => void;
  onDuplicatePage: (page: PageRow) => void;
  onCopyPage: (page: PageRow) => void;
  onCutPage: (page: PageRow) => void;
  // Pastes the page clipboard immediately after the given page.
  onPastePage: (afterPage: PageRow) => void;
  onReorderPages: (orderedPageIds: string[]) => void;
}

// Left panel of the 3-column editor — page thumbnails + add/delete pages.
// Rendered as a floating cream paper card that sits on the green workspace background.
export function PagesSidebar({
  bookletId,
  pages,
  selectedPageId,
  isAddingPage,
  isAddingCover,
  hasCover,
  hasPageClipboard,
  onAddPage,
  onAddCover,
  onDeletePage,
  onDuplicatePage,
  onCopyPage,
  onCutPage,
  onPastePage,
  onReorderPages,
}: PagesSidebarProps) {
  const navigate = useNavigate();
  const [hoveredPageId, setHoveredPageId] = useState<string | null>(null);
  // Page whose action menu is open — keeps its trigger button visible even after
  // the pointer leaves the thumbnail (the menu renders in a portal).
  const [openMenuPageId, setOpenMenuPageId] = useState<string | null>(null);
  const [addHover, setAddHover] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    // The cover is pinned first — never a valid drop target (dropping here would
    // try to push a page before it). The server's reorder_pages re-pins it
    // regardless, but blocking the drop keeps the UI honest.
    if (pages[index]?.is_cover) return;
    e.preventDefault();
    setDropIndex(index);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (dragIndex === null || dropIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }
    const reordered = [...pages];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    onReorderPages(reordered.map((p) => p.id));
    setDragIndex(null);
    setDropIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDropIndex(null);
  }

  return (
    <aside style={{
      width: 196,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: BRAND.cream,
      borderRadius: 20,
      boxShadow: '0 8px 28px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
    }}>

      {/* Panel header */}
      <div style={{
        padding: '13px 16px 10px',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        flexShrink: 0,
      }}>
        <p style={{
          margin: 0, fontSize: 10, fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: BRAND.textMuted,
        }}>
          Pages
        </p>
      </div>

      {/* Add Page — prominent primary action, top of list for discoverability */}
      <div style={{ padding: '12px 12px 8px', flexShrink: 0 }}>
        <button
          type="button"
          disabled={isAddingPage}
          onClick={onAddPage}
          onMouseEnter={() => setAddHover(true)}
          onMouseLeave={() => setAddHover(false)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            padding: '11px 12px',
            borderRadius: 14,
            border: 'none',
            backgroundColor: addHover && !isAddingPage ? BRAND.yellowDark : BRAND.yellow,
            color: BRAND.text,
            fontSize: 13,
            fontWeight: 700,
            cursor: isAddingPage ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.16s, transform 0.16s ease, box-shadow 0.16s ease',
            transform: addHover && !isAddingPage ? 'translateY(-3px)' : 'translateY(0)',
            boxShadow: addHover && !isAddingPage
              ? '0 8px 20px rgba(255,201,77,0.45), 0 3px 8px rgba(0,0,0,0.12)'
              : '0 4px 12px rgba(255,201,77,0.35), 0 1px 4px rgba(0,0,0,0.08)',
            fontFamily: 'inherit',
            opacity: isAddingPage ? 0.72 : 1,
          }}
        >
          {isAddingPage ? <Spinner size="sm" /> : <Plus size={16} />}
          {isAddingPage ? 'Adding…' : 'Add Page'}
        </button>

        {/* Add Cover — only offered when the booklet has no cover yet (≤1 per
            booklet). A subtle secondary action vs. the primary Add Page. */}
        {!hasCover && (
          <button
            type="button"
            disabled={isAddingCover}
            onClick={onAddCover}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              marginTop: 8,
              padding: '9px 12px',
              borderRadius: 14,
              border: '1.5px solid rgba(0,0,0,0.12)',
              backgroundColor: 'transparent',
              color: BRAND.text,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: isAddingCover ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              opacity: isAddingCover ? 0.72 : 1,
            }}
          >
            {isAddingCover ? <Spinner size="sm" /> : <BookImage size={15} />}
            {isAddingCover ? 'Adding…' : 'Add Cover'}
          </button>
        )}
      </div>

      {/* Scrollable thumbnail list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 12px' }}>
        {pages.length === 0 && (
          <p style={{ margin: '20px 0', textAlign: 'center', fontSize: 12, color: BRAND.textMuted }}>
            No pages yet
          </p>
        )}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pages.map((page, index) => {
            const showMenuButton =
              hoveredPageId === page.id ||
              openMenuPageId === page.id ||
              page.id === selectedPageId;
            return (
              <li
                key={page.id}
                // The cover is pinned first and can't be reordered.
                draggable={!page.is_cover}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onMouseEnter={() => setHoveredPageId(page.id)}
                onMouseLeave={() => setHoveredPageId(null)}
                style={{
                  position: 'relative',
                  opacity: dragIndex === index ? 0.4 : 1,
                  transition: 'opacity 0.15s',
                  borderRadius: 12,
                  outline: dropIndex === index && dragIndex !== index
                    ? `2px solid ${BRAND.green}`
                    : '2px solid transparent',
                }}
              >
                <PageThumbnail
                  page={page}
                  pageIndex={index}
                  bookletId={bookletId}
                  isSelected={page.id === selectedPageId}
                  onClick={() => navigate(`/admin/booklets/${bookletId}/pages/${page.id}`)}
                />

                {/* Page actions menu — duplicate / copy / cut / paste / delete */}
                <DropdownMenu
                  open={openMenuPageId === page.id}
                  onOpenChange={(open) => setOpenMenuPageId(open ? page.id : null)}
                >
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        top: -6, right: -6,
                        width: 22, height: 22,
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: BRAND.text,
                        color: '#fff',
                        cursor: 'pointer',
                        display: showMenuButton ? 'flex' : 'none',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        fontFamily: 'inherit',
                      }}
                      aria-label={`Actions for page ${index + 1}`}
                    >
                      <MoreVertical size={12} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="right" className="w-44">
                    {/* The cover is unique and pinned first — duplicate/copy/cut/
                        paste don't apply to it, so only Delete is offered. */}
                    {!page.is_cover && (
                      <>
                        <DropdownMenuItem onSelect={() => onDuplicatePage(page)}>
                          <CopyPlus />
                          Duplicate
                          {/* <DropdownMenuShortcut>⇧⌃D</DropdownMenuShortcut> */}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onCopyPage(page)}>
                          <Copy />
                          Copy
                          {/* <DropdownMenuShortcut>⇧⌃C</DropdownMenuShortcut> */}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onCutPage(page)}>
                          <Scissors />
                          Cut
                          {/* <DropdownMenuShortcut>⇧⌃X</DropdownMenuShortcut> */}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!hasPageClipboard}
                          onSelect={() => onPastePage(page)}
                        >
                          <ClipboardPaste />
                          Paste after
                          {/* <DropdownMenuShortcut>⇧⌃V</DropdownMenuShortcut> */}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem variant="destructive" onSelect={() => onDeletePage(page)}>
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
