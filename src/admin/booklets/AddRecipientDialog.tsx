import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { inputStyle } from '@/admin/shell/adminControls';
import { expiryDateToIso, minExpiryDate } from '@/config/recipients';
import { BRAND } from '@/config/theme';

// Add-a-recipient dialog — same shadcn Dialog pattern as the re-enable confirm in
// BookletListPage. Collects the name and an optional expiry date (RP4). The
// parent owns the mutation (so invalidation lives with the page); this component
// only gathers the fields and calls onAdd. Setting an expiry starts the link
// Published (the parent maps a non-null expiry to status='published').
interface AddRecipientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, expiresAt: string | null) => Promise<void>;
  isPending: boolean;
}

export function AddRecipientDialog({ open, onOpenChange, onAdd, isPending }: AddRecipientDialogProps) {
  const [name, setName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [focused, setFocused] = useState(false);
  const [expiryFocused, setExpiryFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    try {
      await onAdd(trimmed, expiryDate ? expiryDateToIso(expiryDate) : null);
      setName('');
      setExpiryDate('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add user.');
    }
  }

  // Reset the fields/error whenever the dialog closes so it reopens clean.
  function handleOpenChange(next: boolean) {
    if (!next) {
      setName('');
      setExpiryDate('');
      setError(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              Give this person a name (admin-facing only). They get their own private link, created
              unpublished — publish it when you're ready.
            </DialogDescription>
          </DialogHeader>

          <label style={{ display: 'block', margin: '20px 0 4px' }}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dana"
              autoFocus
              required
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={inputStyle(focused)}
            />
          </label>

          <label
            style={{
              display: 'block',
              marginTop: 16,
              fontSize: 13,
              fontWeight: 700,
              color: BRAND.textMuted,
            }}
          >
            Expiry date (optional)
            <input
              type="date"
              value={expiryDate}
              min={minExpiryDate()}
              onChange={(e) => setExpiryDate(e.target.value)}
              onFocus={() => setExpiryFocused(true)}
              onBlur={() => setExpiryFocused(false)}
              style={inputStyle(expiryFocused, { marginTop: 6, fontWeight: 600 })}
            />
            <span style={{ display: 'block', marginTop: 6, fontWeight: 600 }}>
              Setting a date publishes this link now; it auto-unpublishes after that day.
            </span>
          </label>

          {error && (
            <p style={{ margin: '10px 0 0', fontSize: 13, fontWeight: 600, color: BRAND.pink }}>
              {error}
            </p>
          )}

          <DialogFooter style={{ marginTop: 20 }}>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || name.trim() === ''}>
              {isPending ? 'Adding…' : 'Add user'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
