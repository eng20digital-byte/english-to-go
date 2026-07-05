import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { supabase } from '@/lib/supabaseClient';
import { PUBLIC_TOKEN_LENGTH } from '@/config/booklets';
import { DEFAULT_RECIPIENT_STATUS, RECIPIENTS_PAGE_SIZE } from '@/config/recipients';
import { ADMIN_BOOKLETS_QUERY_KEY } from '@/hooks/useBookletQuery';
import type { BookletRecipientRow, RecipientStatus } from '@/types/database';

// Admin data layer for per-recipient publication (migration 0009). Every booklet
// can hand out many independent links, one per named recipient, each with its own
// status/expiry — separate from the admin master link (booklets.status +
// public_token). All writes go straight to the table, gated by the is_admin() RLS
// from 0009, exactly like the booklet status/title mutations — no RPC needed for
// admin writes (the reader is the only caller that needs the security definer RPC,
// since it resolves a single token anonymously). The public reader never reads
// this table directly (it has no anon grant); see get_booklet_by_token.

const RECIPIENT_COLUMNS =
  'id, booklet_id, name, access_token, status, expires_at, published_at, created_at, updated_at';

export const recipientsQueryKey = (bookletId: string) =>
  ['booklet-recipients', bookletId] as const;

// Server-side search/pagination params (RP5). Both are optional so existing
// callers (and the default first render) get page 0, no filter.
export interface RecipientListParams {
  search?: string;
  page?: number; // 0-based
}

// A single page of recipients plus the total match count, so the page can render
// prev/next controls without ever loading the whole list.
export interface RecipientListResult {
  rows: BookletRecipientRow[];
  total: number;
}

// Lists a booklet's recipients in add order (created_at asc), so the manage-users
// page reads chronologically top-to-bottom. Search filters by name server-side
// (`ilike`) and pagination is a server `range` + exact count — the booklet_id
// index (0009) keeps both cheap at scale. The query key includes search/page, but
// the mutations invalidate the shorter `recipientsQueryKey` prefix, which React
// Query matches against every page/search variant.
export function useBookletRecipientsQuery(
  bookletId: string | undefined,
  params: RecipientListParams = {},
) {
  const { search = '', page = 0 } = params;
  const trimmed = search.trim();

  return useQuery({
    queryKey: bookletId
      ? [...recipientsQueryKey(bookletId), { search: trimmed, page }]
      : ['booklet-recipients'],
    enabled: !!bookletId,
    // Keep the previous page visible while the next one loads, so paging/typing
    // doesn't flash the empty/loading state on every keystroke.
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<RecipientListResult> => {
      if (!bookletId) return { rows: [], total: 0 };
      const from = page * RECIPIENTS_PAGE_SIZE;
      const to = from + RECIPIENTS_PAGE_SIZE - 1;

      let query = supabase
        .from('booklet_recipients')
        .select(RECIPIENT_COLUMNS, { count: 'exact' })
        .eq('booklet_id', bookletId)
        .order('created_at', { ascending: true })
        .range(from, to);
      if (trimmed) query = query.ilike('name', `%${trimmed}%`);

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });
}

// Fetches EVERY recipient's link token for the booklet, ignoring search/pagination
// — used only by "Copy all links", which must include rows not on the current
// page. Not a hook: it's a one-shot read triggered by the copy action.
export async function fetchAllRecipientTokens(bookletId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('booklet_recipients')
    .select('access_token')
    .eq('booklet_id', bookletId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => r.access_token);
}

// Every recipient mutation invalidates both the booklet's recipient list AND the
// admin-booklets list (RP3 renders a per-card recipient count sourced from that
// list query — see ADMIN_BOOKLETS_QUERY_KEY).
function useRecipientInvalidation(bookletId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: recipientsQueryKey(bookletId) });
    queryClient.invalidateQueries({ queryKey: ADMIN_BOOKLETS_QUERY_KEY });
  };
}

export function useAddRecipientMutation(bookletId: string) {
  const invalidate = useRecipientInvalidation(bookletId);

  return useMutation({
    mutationFn: async ({
      name,
      status = DEFAULT_RECIPIENT_STATUS,
      expiresAt = null,
    }: {
      name: string;
      status?: RecipientStatus;
      expiresAt?: string | null;
    }): Promise<BookletRecipientRow> => {
      // Fresh independent nanoid — unguessable from the master token or from any
      // other recipient (reuses the useCreateBookletMutation idiom). published_at
      // is an audit stamp, set only when the link is actually born live.
      const { data, error } = await supabase
        .from('booklet_recipients')
        .insert({
          booklet_id: bookletId,
          name,
          access_token: nanoid(PUBLIC_TOKEN_LENGTH),
          status,
          expires_at: expiresAt,
          published_at: status === 'published' ? new Date().toISOString() : null,
        })
        .select(RECIPIENT_COLUMNS)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateRecipientStatusMutation(bookletId: string) {
  const invalidate = useRecipientInvalidation(bookletId);

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: RecipientStatus;
    }): Promise<void> => {
      const now = new Date().toISOString();
      // Stamp published_at only on the transition to live (audit of last go-live);
      // updated_at is app-maintained (no DB trigger on this table — 0009).
      const { error } = await supabase
        .from('booklet_recipients')
        .update({
          status,
          updated_at: now,
          ...(status === 'published' ? { published_at: now } : {}),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

// Bulk publish/unpublish (RP5). Passing `ids` targets exactly those rows (the
// checkbox multi-select); omitting `ids` targets every recipient of the booklet
// via `booklet_id` — the "Publish all / Unpublish all" bar action, which must
// also reach rows not on the current page. Same published_at audit stamp on the
// transition to live as the single-row mutation.
export function useBulkUpdateRecipientStatusMutation(bookletId: string) {
  const invalidate = useRecipientInvalidation(bookletId);

  return useMutation({
    mutationFn: async ({
      ids,
      status,
    }: {
      ids?: string[];
      status: RecipientStatus;
    }): Promise<void> => {
      if (ids && ids.length === 0) return;
      const now = new Date().toISOString();
      const patch = {
        status,
        updated_at: now,
        ...(status === 'published' ? { published_at: now } : {}),
      };
      const base = supabase.from('booklet_recipients').update(patch);
      const { error } = await (ids ? base.in('id', ids) : base.eq('booklet_id', bookletId));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

// Bulk delete for the checkbox multi-select — one `in (...)` round-trip instead
// of looping the single-row delete.
export function useBulkDeleteRecipientsMutation(bookletId: string) {
  const invalidate = useRecipientInvalidation(bookletId);

  return useMutation({
    mutationFn: async (ids: string[]): Promise<void> => {
      if (ids.length === 0) return;
      const { error } = await supabase.from('booklet_recipients').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

// Sets (or clears) a recipient's expiry date. A future date ALSO republishes the
// link — this is what makes "changing the date again makes it live again" true,
// even after a lazy expiry flipped it to unpublished. Clearing the date (null)
// leaves the current status untouched (an already-published link just loses its
// expiry; an unpublished one stays unpublished).
export function useUpdateRecipientExpiryMutation(bookletId: string) {
  const invalidate = useRecipientInvalidation(bookletId);

  return useMutation({
    mutationFn: async ({
      id,
      expiresAt,
    }: {
      id: string;
      expiresAt: string | null;
    }): Promise<void> => {
      const now = new Date().toISOString();

      if (expiresAt === null) {
        const { error } = await supabase
          .from('booklet_recipients')
          .update({ expires_at: null, updated_at: now })
          .eq('id', id);
        if (error) throw error;
        return;
      }

      // Future-only guard (belt-and-suspenders with the UI `min` = tomorrow): a
      // past/now date would immediately re-expire, which is never a useful write.
      if (new Date(expiresAt) <= new Date()) {
        throw new Error('Expiry date must be in the future.');
      }
      const { error } = await supabase
        .from('booklet_recipients')
        .update({
          expires_at: expiresAt,
          status: 'published',
          published_at: now,
          updated_at: now,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

// Rotates the access_token to a fresh nanoid, killing the old /b/:token link while
// keeping name/status/expiry — the admin's "this link leaked, revoke it" action.
export function useRotateRecipientTokenMutation(bookletId: string) {
  const invalidate = useRecipientInvalidation(bookletId);

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('booklet_recipients')
        .update({ access_token: nanoid(PUBLIC_TOKEN_LENGTH), updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteRecipientMutation(bookletId: string) {
  const invalidate = useRecipientInvalidation(bookletId);

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('booklet_recipients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
