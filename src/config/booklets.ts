import type { BookletStatus } from '@/types/database';

// Booklet creation config — see CLAUDE.md "Public link": public_token is a
// randomly generated unguessable nanoid, never an admin-chosen slug.
export const PUBLIC_TOKEN_LENGTH = 12;

// ── Booklet library: search / filter / sort (BookletListPage) ───────────────
// Option lists live here (config, not components) per the code-quality bar's
// "no magic values in components" rule. The pure filtering/sorting logic that
// consumes them is in src/admin/bookletLibraryFilters.ts.

export type BookletSortValue =
  | 'newest'
  | 'oldest'
  | 'recently-updated'
  | 'title-asc'
  | 'title-desc';

export interface BookletSortOption {
  value: BookletSortValue;
  label: string;
}

// Default keeps parity with the server-side query order (created_at desc in
// useBookletsQuery), so the list looks identical until the admin changes it.
export const DEFAULT_BOOKLET_SORT: BookletSortValue = 'newest';

export const BOOKLET_SORT_OPTIONS: BookletSortOption[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'recently-updated', label: 'Recently updated' },
  { value: 'title-asc', label: 'Title (A–Z)' },
  { value: 'title-desc', label: 'Title (Z–A)' },
];

// 'all' is a UI-only pseudo-status, deliberately kept separate from the
// BookletStatus DB enum so the database stays the single source of truth for
// real statuses.
export type BookletStatusFilter = 'all' | BookletStatus;

export interface BookletStatusFilterOption {
  value: BookletStatusFilter;
  label: string;
}

export const DEFAULT_BOOKLET_STATUS_FILTER: BookletStatusFilter = 'all';

// 'draft' is intentionally omitted as a filter pill — the admin has no need to
// filter the library down to unpublished drafts. The status itself still exists
// on the row (and in countBookletsByStatus); it's just not a selectable filter.
export const BOOKLET_STATUS_FILTERS: BookletStatusFilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'disabled', label: 'Disabled' },
];
