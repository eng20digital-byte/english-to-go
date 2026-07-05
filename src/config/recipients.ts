import type { BookletRecipientRow, RecipientStatus } from '@/types/database';

// Per-recipient publication config (migration 0009). A recipient link's publish
// state is independent of the admin's master link (booklets.status) — see
// docs/recipient-publication-milestones/. Labels/constants live here so
// components never carry magic status strings (code-quality bar).

// A freshly added recipient starts unpublished: it matches the DB column default
// and the expiry rule that "setting a future date is what makes it live", so a
// new link is never public by accident before the admin explicitly publishes it
// (or an expiry date does).
export const DEFAULT_RECIPIENT_STATUS: RecipientStatus = 'unpublished';

// Server-side page size for the manage-users list (RP5). The list is fetched with
// `.range()` + an exact count so a booklet with many recipients never loads all
// rows at once; the booklet_id index (migration 0009) keeps each page cheap.
export const RECIPIENTS_PAGE_SIZE = 10;

// Debounce before a typed search hits the server, so the paginated query fires
// once the admin pauses rather than on every keystroke (RP5).
export const RECIPIENT_SEARCH_DEBOUNCE_MS = 300;

// The status the admin UI actually shows. It's a superset of the stored
// RecipientStatus with a computed "expired" case, so the badge/row can show
// "Expired" the instant the date passes — WITHOUT waiting on the lazy DB flip
// that only happens when someone next opens the link (see get_booklet_by_token
// in migration 0009). Display never depends on that server-side write.
export type EffectiveStatus = 'published' | 'unpublished' | 'expired';

export const EFFECTIVE_STATUS_LABELS: Record<EffectiveStatus, string> = {
  published: 'Published',
  unpublished: 'Unpublished',
  expired: 'Expired',
};

// Pure derivation, mirroring the RPC's gate: a link only counts as live if it's
// stored published AND (no expiry OR the expiry is still in the future).
export function recipientEffectiveStatus(r: BookletRecipientRow): EffectiveStatus {
  if (r.status !== 'published') return 'unpublished';
  if (r.expires_at && new Date(r.expires_at) <= new Date()) return 'expired';
  return 'published';
}

// --- Expiry date helpers (pure) ---------------------------------------------
// The UI control is an <input type="date"> (local calendar day, "YYYY-MM-DD"),
// but expires_at is a full timestamptz. These convert between the two and keep
// the "future-only" rule in one place.

// Format a local Date as the "YYYY-MM-DD" string an <input type="date"> expects.
function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Earliest selectable expiry = tomorrow (local). Bound to the input's `min` so
// today/past can't be picked; the mutation guards it again server-side-adjacent.
export function minExpiryDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateInputValue(tomorrow);
}

// A picked calendar day means "active through the end of that day", so the link
// expires at local end-of-day — picking "Aug 1" keeps it live all of Aug 1.
export function expiryDateToIso(dateValue: string): string {
  const [y, m, d] = dateValue.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

// Stored timestamp → the "YYYY-MM-DD" the date input should show (local day).
export function isoToExpiryDate(iso: string): string {
  return toDateInputValue(new Date(iso));
}

// Human-facing expiry day for the row label ("Active until …" / "Expired …").
export function formatExpiryDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
