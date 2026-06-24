import { ImageIcon, Redo2, RotateCcw, Save, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/Spinner';
import type { SaveStatus } from './useAutosave';

interface EditorToolbarProps {
  onAddText: () => void;
  onAddBackgroundImage: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  saveStatus: SaveStatus;
  onSaveNow: () => void;
}

function ToolbarIconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={onClick}
          className="h-8 w-8 rounded-full text-foreground/70 hover:bg-muted hover:text-foreground"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

// Floating pill toolbar above the editor canvas — icon buttons with tooltips.
// Delete action moved to the floating action bubble on selected elements.
export function EditorToolbar({
  onAddText,
  onAddBackgroundImage,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  saveStatus,
  onSaveNow,
}: EditorToolbarProps) {
  return (
    <div className="flex justify-center py-3">
      <div
        className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5"
        style={{ boxShadow: 'var(--shadow-float)' }}
      >
        {/* Add elements */}
        <ToolbarIconButton label="Add text box" onClick={onAddText}>
          <Type className="h-4 w-4" />
        </ToolbarIconButton>
        <ToolbarIconButton label="Add background image" onClick={onAddBackgroundImage}>
          <ImageIcon className="h-4 w-4" />
        </ToolbarIconButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Undo / redo */}
        <ToolbarIconButton label="Undo" disabled={!canUndo} onClick={onUndo}>
          <RotateCcw className="h-4 w-4" />
        </ToolbarIconButton>
        <ToolbarIconButton label="Redo" disabled={!canRedo} onClick={onRedo}>
          <Redo2 className="h-4 w-4" />
        </ToolbarIconButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Save status */}
        {saveStatus === 'saving' && (
          <div className="flex items-center gap-1.5 px-2 text-xs text-muted-foreground">
            <Spinner size="sm" />
            <span>Saving…</span>
          </div>
        )}
        {saveStatus === 'saved' && (
          <span className="px-2 text-xs text-muted-foreground">Saved</span>
        )}
        {saveStatus === 'error' && (
          <span className="px-2 text-xs text-destructive">Save failed</span>
        )}
        {saveStatus === 'idle' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onSaveNow}
                className="h-8 w-8 rounded-full text-foreground/70 hover:bg-muted hover:text-foreground"
              >
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Save now</TooltipContent>
          </Tooltip>
        )}
        {saveStatus !== 'idle' && saveStatus !== 'saving' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onSaveNow}
                className="h-8 w-8 rounded-full text-foreground/70 hover:bg-muted hover:text-foreground"
              >
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Save now</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
