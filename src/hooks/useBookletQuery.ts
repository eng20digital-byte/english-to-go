import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { supabase } from '@/lib/supabaseClient';
import { PUBLIC_TOKEN_LENGTH } from '@/config/booklets';
import type { PageElement } from '@/types/elements';
import type { PageCanvasPage } from '@/renderer/PageCanvas';
import type { BookletRow, BookletStatus, PageRow } from '@/types/database';

export interface ReaderBookletPage extends PageCanvasPage {
  is_quiz_page: boolean;
  is_cover: boolean;
  is_back_cover: boolean;
}

export interface ReaderBooklet {
  id: string;
  title: string;
  canvas_width: number;
  canvas_height: number;
  background_color: string;
  quiz_embed_code: string | null;
  quiz_embed_height: number | null;
  show_quiz_on_last_spread: boolean;
  pages: ReaderBookletPage[];
}

interface BookletQueryRow {
  id: string;
  title: string;
  canvas_width: number;
  canvas_height: number;
  background_color: string;
  quiz_embed_code: string | null;
  quiz_embed_height: number | null;
  show_quiz_on_last_spread: boolean;
  pages: {
    id: string;
    page_order: number;
    is_quiz_page: boolean;
    is_cover: boolean;
    is_back_cover: boolean;
    page_elements: PageElement[];
  }[];
}

// Resolves a booklet for the public reader through the get_booklet_by_token RPC
// (migration 0009). The RPC is a security definer that first resolves a
// per-recipient access_token (a published grant, expiry enforced server-side),
// then falls back to the admin master link (booklets.public_token +
// status='published') — returning the exact same nested booklet → pages →
// elements shape the old RLS nested-select returned. An unknown token and a
// draft/disabled/unpublished/expired one all resolve to the same `null`; the
// reader renders one generic not-found for every case (see CLAUDE.md "No
// draft/live content fork" and M5 verification steps 3-4) rather than leaking
// which case occurred. Pages/elements come back pre-ordered (page_order, then
// z_index) from the RPC, so no client-side ordering is needed.
export function useBookletByToken(token: string | undefined) {
  return useQuery({
    queryKey: ['booklet', token],
    enabled: !!token,
    queryFn: async (): Promise<ReaderBooklet | null> => {
      if (!token) return null;

      const { data, error } = await supabase.rpc('get_booklet_by_token', { p_token: token });
      if (error) throw error;
      if (!data) return null;

      const booklet = data as BookletQueryRow;
      return {
        id: booklet.id,
        title: booklet.title,
        canvas_width: booklet.canvas_width,
        canvas_height: booklet.canvas_height,
        background_color: booklet.background_color,
        quiz_embed_code: booklet.quiz_embed_code,
        quiz_embed_height: booklet.quiz_embed_height,
        show_quiz_on_last_spread: booklet.show_quiz_on_last_spread,
        pages: booklet.pages.map((page) => ({
          id: page.id,
          elements: page.page_elements,
          is_quiz_page: page.is_quiz_page,
          is_cover: page.is_cover,
          is_back_cover: page.is_back_cover,
        })),
      };
    },
  });
}

// ============================================================================
// Admin hooks — BookletListPage / BookletEditorPage (M7). RLS lets is_admin()
// see every status, unlike the public useBookletByToken above.
// ============================================================================

// Exported so recipient mutations (useBookletRecipientsQuery) can invalidate the
// same key — a card's recipient count (RP3) is refetched from this list query.
export const ADMIN_BOOKLETS_QUERY_KEY = ['admin-booklets'] as const;
const adminBookletQueryKey = (id: string) => ['admin-booklet', id] as const;

// A library card also shows how many recipients a booklet has ("Manage users
// (N)"), so the list query carries a recipient_count alongside the booklet row.
export interface BookletListItem extends BookletRow {
  recipient_count: number;
}

export function useBookletsQuery() {
  return useQuery({
    queryKey: ADMIN_BOOKLETS_QUERY_KEY,
    queryFn: async (): Promise<BookletListItem[]> => {
      // booklet_recipients(count) is a single aggregate embed — one query for all
      // cards, not an N+1 per card. PostgREST returns it as [{ count }].
      const { data, error } = await supabase
        .from('booklets')
        .select(
          'id, public_token, title, status, canvas_width, canvas_height, background_color, quiz_embed_code, quiz_embed_height, show_quiz_on_last_spread, created_at, updated_at, booklet_recipients(count)',
        )
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const { booklet_recipients, ...booklet } = row as BookletRow & {
          booklet_recipients: { count: number }[] | null;
        };
        return { ...booklet, recipient_count: booklet_recipients?.[0]?.count ?? 0 };
      });
    },
  });
}

export interface AdminBookletDetail extends BookletRow {
  pages: PageRow[];
}

export function useBookletDetailQuery(bookletId: string | undefined) {
  return useQuery({
    queryKey: bookletId ? adminBookletQueryKey(bookletId) : ['admin-booklet'],
    enabled: !!bookletId,
    queryFn: async (): Promise<AdminBookletDetail | null> => {
      if (!bookletId) return null;

      const { data, error } = await supabase
        .from('booklets')
        .select(
          'id, public_token, title, status, canvas_width, canvas_height, background_color, quiz_embed_code, quiz_embed_height, show_quiz_on_last_spread, created_at, updated_at, pages(id, booklet_id, page_order, is_quiz_page, is_cover, is_back_cover, created_at)',
        )
        .eq('id', bookletId)
        .order('page_order', { referencedTable: 'pages' })
        .maybeSingle();
      if (error) throw error;
      return data as AdminBookletDetail | null;
    },
  });
}

export function useCreateBookletMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title: string): Promise<BookletRow> => {
      const { data, error } = await supabase
        .from('booklets')
        .insert({ title, public_token: nanoid(PUBLIC_TOKEN_LENGTH) })
        .select(
          'id, public_token, title, status, canvas_width, canvas_height, background_color, quiz_embed_code, quiz_embed_height, show_quiz_on_last_spread, created_at, updated_at',
        )
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_BOOKLETS_QUERY_KEY });
    },
  });
}

export function useDeleteBookletMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('booklets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_BOOKLETS_QUERY_KEY });
    },
  });
}

export function useUpdateBookletStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookletStatus }): Promise<void> => {
      const { error } = await supabase.from('booklets').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_BOOKLETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: adminBookletQueryKey(id) });
    },
  });
}

// Title is admin-facing only (CLAUDE.md booklets table). Edited explicitly via
// the inline header field in the editor, not autosaved like page_elements.
export function useUpdateBookletTitleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }): Promise<void> => {
      const { error } = await supabase.from('booklets').update({ title }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_BOOKLETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: adminBookletQueryKey(id) });
    },
  });
}

// Per-booklet page-canvas background color (migration 0005). A single scalar
// booklet setting, edited explicitly from the editor header — saved on commit
// (color-picker blur), not autosaved per drag, same shape as the title mutation.
export function useUpdateBookletBackgroundColorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      backgroundColor,
    }: {
      id: string;
      backgroundColor: string;
    }): Promise<void> => {
      const { error } = await supabase
        .from('booklets')
        .update({ background_color: backgroundColor })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_BOOKLETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: adminBookletQueryKey(id) });
    },
  });
}

// QuizEmbedEditor (M11) — booklet-level fields, saved explicitly (not
// autosaved like page_elements) since they're a small, infrequently-edited
// pair of fields rather than continuous drag/type edits.
export function useUpdateBookletQuizMutation(bookletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      quizEmbedCode,
      quizEmbedHeight,
      showQuizOnLastSpread,
    }: {
      quizEmbedCode: string | null;
      quizEmbedHeight: number;
      showQuizOnLastSpread: boolean;
    }): Promise<void> => {
      const { error } = await supabase
        .from('booklets')
        .update({
          quiz_embed_code: quizEmbedCode,
          quiz_embed_height: quizEmbedHeight,
          show_quiz_on_last_spread: showQuizOnLastSpread,
        })
        .eq('id', bookletId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminBookletQueryKey(bookletId) });
    },
  });
}
