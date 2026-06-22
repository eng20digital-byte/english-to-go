import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { PageRow } from '@/types/database';

// Page CRUD/reorder for BookletEditorPage (M7). Structural mutations
// (add/delete/reorder) go through RPCs in supabase/migrations/0002_page_management.sql
// because they renumber page_order across multiple rows and maintain the
// "only the last page may be the quiz page" invariant atomically — direct
// client-side updates can't do either safely.
const adminBookletQueryKey = (id: string) => ['admin-booklet', id] as const;

export function useAddPageMutation(bookletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<PageRow> => {
      // add_page returns a single `pages` row (not SETOF), so PostgREST
      // already responds with one JSON object — no `.single()` needed (and
      // adding it would incorrectly imply the RPC result is array-shaped).
      const { data, error } = await supabase.rpc('add_page', { p_booklet_id: bookletId });
      if (error) throw error;
      return data as PageRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminBookletQueryKey(bookletId) });
    },
  });
}

export function useDeletePageMutation(bookletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pageId: string): Promise<void> => {
      const { error } = await supabase.rpc('delete_page', { p_page_id: pageId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminBookletQueryKey(bookletId) });
    },
  });
}

export function useReorderPagesMutation(bookletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedPageIds: string[]): Promise<void> => {
      const { error } = await supabase.rpc('reorder_pages', {
        p_booklet_id: bookletId,
        p_page_ids: orderedPageIds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminBookletQueryKey(bookletId) });
    },
  });
}

export function useSetQuizPageMutation(bookletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pageId,
      isQuizPage,
    }: {
      pageId: string;
      isQuizPage: boolean;
    }): Promise<void> => {
      const { error } = await supabase
        .from('pages')
        .update({ is_quiz_page: isQuizPage })
        .eq('id', pageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminBookletQueryKey(bookletId) });
    },
  });
}
