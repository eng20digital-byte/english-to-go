import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Spinner } from '@/components/Spinner';
import { PageThumbnail } from './PageThumbnail';
import type { PageRow } from '@/types/database';
import { BRAND } from '@/config/theme';

interface PagesSidebarProps {
  bookletId: string;
  pages: PageRow[];
  selectedPageId: string | undefined;
  isAddingPage: boolean;
  onAddPage: () => void;
  onDeletePage: (page: PageRow) => void;
}

// Left panel of the 3-column editor — page thumbnails + add/delete pages.
// Rendered as a floating cream paper card that sits on the green workspace background.
export function PagesSidebar({
  bookletId,
  pages,
  selectedPageId,
  isAddingPage,
  onAddPage,
  onDeletePage,
}: PagesSidebarProps) {
  const navigate = useNavigate();
  const [hoveredPageId, setHoveredPageId] = useState<string | null>(null);
  const [addHover, setAddHover] = useState(false);

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
      </div>

      {/* Scrollable thumbnail list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 12px' }}>
        {pages.length === 0 && (
          <p style={{ margin: '20px 0', textAlign: 'center', fontSize: 12, color: BRAND.textMuted }}>
            No pages yet
          </p>
        )}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pages.map((page, index) => (
            <li
              key={page.id}
              style={{ position: 'relative' }}
              onMouseEnter={() => setHoveredPageId(page.id)}
              onMouseLeave={() => setHoveredPageId(null)}
            >
              <PageThumbnail
                page={page}
                pageIndex={index}
                bookletId={bookletId}
                isSelected={page.id === selectedPageId}
                onClick={() => navigate(`/admin/booklets/${bookletId}/pages/${page.id}`)}
              />

              {/* Delete button — appears on hover */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePage(page);
                    }}
                    style={{
                      position: 'absolute',
                      top: -6, right: -6,
                      width: 20, height: 20,
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: BRAND.pink,
                      color: '#fff',
                      cursor: 'pointer',
                      display: hoveredPageId === page.id ? 'flex' : 'none',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      boxShadow: '0 2px 6px rgba(250,103,129,0.4)',
                      fontFamily: 'inherit',
                    }}
                    aria-label={`Delete page ${index + 1}`}
                  >
                    <Trash2 size={10} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Delete page {index + 1}
                </TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
