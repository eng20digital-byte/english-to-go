import { Button } from '@/components/ui/button';
import type { SaveStatus } from './useAutosave';

interface EditorToolbarProps {
  onAddText: () => void;
  onAddBackgroundImage: () => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  saveStatus: SaveStatus;
  onSaveNow: () => void;
}

const SAVE_STATUS_LABEL: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed',
};

export function EditorToolbar({
  onAddText,
  onAddBackgroundImage,
  onDeleteSelected,
  hasSelection,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  saveStatus,
  onSaveNow,
}: EditorToolbarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" onClick={onAddText}>
        Add text box
      </Button>
      <Button type="button" variant="outline" onClick={onAddBackgroundImage}>
        Add background image
      </Button>
      <Button
        type="button"
        variant="destructive"
        disabled={!hasSelection}
        onClick={onDeleteSelected}
      >
        Delete selected
      </Button>
      <div className="ml-auto flex items-center gap-3">
        <span
          className={`text-sm ${saveStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          {SAVE_STATUS_LABEL[saveStatus]}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={onSaveNow}>
          Save now
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!canUndo} onClick={onUndo}>
          Undo
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!canRedo} onClick={onRedo}>
          Redo
        </Button>
      </div>
    </div>
  );
}
