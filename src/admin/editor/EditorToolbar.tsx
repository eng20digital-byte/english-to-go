import { useState } from 'react';
import { ImageIcon, Redo2, RotateCcw, Save, Type } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Spinner } from '@/components/Spinner';
import { BRAND } from '@/config/theme';
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
  const [hovered, setHovered] = useState(false);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            width: 36, height: 36,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: hovered && !disabled ? 'rgba(89,178,146,0.14)' : 'transparent',
            color: disabled ? 'rgba(26,26,26,0.28)' : BRAND.text,
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background-color 0.15s, color 0.15s',
            padding: 0,
            fontFamily: 'inherit',
            flexShrink: 0,
          }}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

// Floating pill toolbar above the editor canvas — icon buttons with tooltips.
// Styled as a cream paper card consistent with all other admin page panels.
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
    <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        backgroundColor: BRAND.cream,
        borderRadius: 50,
        padding: '5px 10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.08)',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
      }}>
        {/* Add elements */}
        <ToolbarIconButton label="Add text box" onClick={onAddText}>
          <Type size={16} />
        </ToolbarIconButton>
        <ToolbarIconButton label="Add background image" onClick={onAddBackgroundImage}>
          <ImageIcon size={16} />
        </ToolbarIconButton>

        <div style={{ width: 1, height: 20, backgroundColor: 'rgba(0,0,0,0.1)', margin: '0 4px', flexShrink: 0 }} />

        {/* Undo / redo */}
        <ToolbarIconButton label="Undo" disabled={!canUndo} onClick={onUndo}>
          <RotateCcw size={16} />
        </ToolbarIconButton>
        <ToolbarIconButton label="Redo" disabled={!canRedo} onClick={onRedo}>
          <Redo2 size={16} />
        </ToolbarIconButton>

        <div style={{ width: 1, height: 20, backgroundColor: 'rgba(0,0,0,0.1)', margin: '0 4px', flexShrink: 0 }} />

        {/* Save status text */}
        {saveStatus === 'saving' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 6px', fontSize: 12, color: BRAND.textMuted }}>
            <Spinner size="sm" />
            <span>Saving…</span>
          </div>
        )}
        {saveStatus === 'saved' && (
          <span style={{ padding: '0 6px', fontSize: 12, fontWeight: 600, color: BRAND.green }}>✓ Saved</span>
        )}
        {saveStatus === 'error' && (
          <span style={{ padding: '0 6px', fontSize: 12, fontWeight: 600, color: BRAND.pink }}>Save failed</span>
        )}

        {/* Save now button — visible whenever not actively saving */}
        {saveStatus !== 'saving' && (
          <ToolbarIconButton label="Save now" onClick={onSaveNow}>
            <Save size={16} />
          </ToolbarIconButton>
        )}
      </div>
    </div>
  );
}
