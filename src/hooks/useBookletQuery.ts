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
}

export interface ReaderBooklet {
  id: string;
  title: string;
  canvas_width: number;
  canvas_height: number;
  quiz_embed_code: string | null;
  quiz_embed_height: number | null;
  pages: ReaderBookletPage[];
}

interface BookletQueryRow {
  id: string;
  title: string;
  canvas_width: number;
  canvas_height: number;
  quiz_embed_code: string | null;
  quiz_embed_height: number | null;
  pages: {
    id: string;
    page_order: number;
    is_quiz_page: boolean;
    is_cover: boolean;
    page_elements: PageElement[];
  }[];
}

// Single nested select pulls the booklet, its pages, and each page's
// elements in one round trip — RLS is enforced independently at each table
// (booklets/pages/page_elements), so anonymous callers only ever see rows
// belonging to a published booklet. That means an unknown token and a
// draft/disabled one both resolve here to the same `null`; the reader
// renders one generic not-found state for both (see CLAUDE.md "No draft/live
// content fork" and M5 manual verification steps 3-4) rather than leaking
// which case occurred.
export function useBookletByToken(token: string | undefined) {
  return useQuery({
    queryKey: ['booklet', token],
    enabled: !!token,
    queryFn: async (): Promise<ReaderBooklet | null> => {
      if (!token) return null;

      const { data, error } = await supabase
        .from('booklets')
        .select(
          'id, title, canvas_width, canvas_height, quiz_embed_code, quiz_embed_height, pages(id, page_order, is_quiz_page, is_cover, page_elements(id, page_id, type, z_index, x, y, w, h, rotation, props))',
        )
        .eq('public_token', token)
        .order('page_order', { referencedTable: 'pages' })
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const booklet = data as BookletQueryRow;
      return {
        id: booklet.id,
        title: booklet.title,
        canvas_width: booklet.canvas_width,
        canvas_height: booklet.canvas_height,
        quiz_embed_code: booklet.quiz_embed_code,
        quiz_embed_height: booklet.quiz_embed_height,
        pages: booklet.pages.map((page) => ({
          id: page.id,
          elements: page.page_elements,
          is_quiz_page: page.is_quiz_page,
          is_cover: page.is_cover,
        })),
      };
    },
  });
}

// ============================================================================
// Admin hooks — BookletListPage / BookletEditorPage (M7). RLS lets is_admin()
// see every status, unlike the public useBookletByToken above.
// ============================================================================

const ADMIN_BOOKLETS_QUERY_KEY = ['admin-booklets'] as const;
const adminBookletQueryKey = (id: string) => ['admin-booklet', id] as const;

export function useBookletsQuery() {
  return useQuery({
    queryKey: ADMIN_BOOKLETS_QUERY_KEY,
    queryFn: async (): Promise<BookletRow[]> => {
      const { data, error } = await supabase
        .from('booklets')
        .select(
          'id, public_token, title, status, canvas_width, canvas_height, quiz_embed_code, quiz_embed_height, created_at, updated_at',
        )
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
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
          'id, public_token, title, status, canvas_width, canvas_height, quiz_embed_code, quiz_embed_height, created_at, updated_at, pages(id, booklet_id, page_order, is_quiz_page, is_cover, created_at)',
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
          'id, public_token, title, status, canvas_width, canvas_height, quiz_embed_code, quiz_embed_height, created_at, updated_at',
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

// QuizEmbedEditor (M11) — booklet-level fields, saved explicitly (not
// autosaved like page_elements) since they're a small, infrequently-edited
// pair of fields rather than continuous drag/type edits.
export function useUpdateBookletQuizMutation(bookletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      quizEmbedCode,
      quizEmbedHeight,
    }: {
      quizEmbedCode: string | null;
      quizEmbedHeight: number;
    }): Promise<void> => {
      const { error } = await supabase
        .from('booklets')
        .update({ quiz_embed_code: quizEmbedCode, quiz_embed_height: quizEmbedHeight })
        .eq('id', bookletId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminBookletQueryKey(bookletId) });
    },
  });
}
