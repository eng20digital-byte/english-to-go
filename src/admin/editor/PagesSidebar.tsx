import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Spinner } from '@/components/Spinner';
import { PageThumbnail } from './PageThumbnail';
import type { PageRow } from '@/types/database';

interface PagesSidebarProps {
  bookletId: string;
  pages: PageRow[];
  selectedPageId: string | undefined;
  isAddingPage: boolean;
  onAddPage: () => void;
  onDeletePage: (page: PageRow) => void;
}

// Left panel of the 3-column editor — page thumbnails + add/delete pages.
export function PagesSidebar({
  bookletId,
  pages,
  selectedPageId,
  isAddingPage,
  onAddPage,
  onDeletePage,
}: PagesSidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className="flex w-[200px] shrink-0 flex-col overflow-hidden border-r border-border bg-muted/40">
      <div className="border-b border-border px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
          Pages
        </p>
      </div>

      {/* Scrollable thumbnail list */}
      <div className="flex-1 overflow-y-auto p-3">
        {pages.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">No pages yet</p>
        )}
        <ul className="flex flex-col gap-3">
          {pages.map((page, index) => (
            <li key={page.id} className="group relative flex justify-center">
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
                    className="absolute -top-1.5 -right-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow-sm transition-opacity group-hover:flex group-hover:opacity-100"
                    aria-label={`Delete page ${index + 1}`}
                  >
                    <Trash2 className="h-2.5 w-2.5" />
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

      {/* Add page button */}
      <div className="border-t border-border p-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isAddingPage}
          onClick={onAddPage}
          className="w-full justify-start gap-1.5 text-muted-foreground hover:text-foreground"
        >
          {isAddingPage ? <Spinner size="sm" /> : <Plus className="h-3.5 w-3.5" />}
          Add page
        </Button>
      </div>
    </aside>
  );
}
