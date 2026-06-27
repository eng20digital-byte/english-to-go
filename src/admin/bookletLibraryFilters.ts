// Pure search/filter/sort logic for the booklet library (BookletListPage).
// Kept separate from the UI so the rules are obvious and unit-testable, per
// the code-quality bar's "split data-fetching, UI, and business logic".
import type { BookletRow } from '@/types/database';
import type { BookletSortValue, BookletStatusFilter } from '@/config/booklets';

export interface BookletFilterState {
  search: string;
  status: BookletStatusFilter;
  sort: BookletSortValue;
}

// Title is admin-facing; the public token is also matched because it's the
// link printed on every card and the only handle the admin has on a published
// booklet (CLAUDE.md "Public link") — so pasting a token finds its booklet.
function matchesSearch(booklet: BookletRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    booklet.title.toLowerCase().includes(q) ||
    booklet.public_token.toLowerCase().includes(q)
  );
}

const timeOf = (iso: string): number => new Date(iso).getTime();
const byTitle = (a: BookletRow, b: BookletRow): number =>
  a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

const SORT_COMPARATORS: Record<BookletSortValue, (a: BookletRow, b: BookletRow) => number> = {
  newest: (a, b) => timeOf(b.created_at) - timeOf(a.created_at),
  oldest: (a, b) => timeOf(a.created_at) - timeOf(b.created_at),
  'recently-updated': (a, b) => timeOf(b.updated_at) - timeOf(a.updated_at),
  'title-asc': (a, b) => byTitle(a, b),
  'title-desc': (a, b) => byTitle(b, a),
};

export function filterAndSortBooklets(
  booklets: BookletRow[],
  { search, status, sort }: BookletFilterState,
): BookletRow[] {
  const filtered = booklets.filter(
    (b) => (status === 'all' || b.status === status) && matchesSearch(b, search),
  );
  // Copy before sorting — never mutate the React Query cache array in place.
  return [...filtered].sort(SORT_COMPARATORS[sort]);
}

// Counts for the status-filter pills. Deliberately computed over the *whole*
// library (search not applied) so the pills stay stable as the admin types and
// always show the true size of each status bucket.
export function countBookletsByStatus(
  booklets: BookletRow[],
): Record<BookletStatusFilter, number> {
  const counts: Record<BookletStatusFilter, number> = {
    all: booklets.length,
    draft: 0,
    published: 0,
    disabled: 0,
  };
  for (const b of booklets) counts[b.status] += 1;
  return counts;
}
