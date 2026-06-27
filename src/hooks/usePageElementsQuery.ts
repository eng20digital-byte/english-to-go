import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { PageElement } from '@/types/elements';

// Single source of truth for reading a page's elements, shared by the query hook
// below and by imperative callers (page copy/cut capture an arbitrary page's
// elements into the page clipboard without mounting an editor for it).
export async function fetchPageElements(pageId: string): Promise<PageElement[]> {
  const { data, error } = await supabase
    .from('page_elements')
    .select('id, page_id, type, z_index, x, y, w, h, rotation, props')
    .eq('page_id', pageId)
    .order('z_index');
  if (error) throw error;
  return data as PageElement[];
}

// Admin-only initial load of a single page's elements for the editor — only
// fetched once per mounted page (PageElementEditor seeds the reducer and
// edits live there from then on). Persistence back to Supabase happens via
// useAutosave's save_page_elements RPC call, not a query-layer mutation.
export function usePageElementsQuery(pageId: string | undefined) {
  return useQuery({
    queryKey: pageId ? ['page-elements', pageId] : ['page-elements'],
    enabled: !!pageId,
    queryFn: async (): Promise<PageElement[]> => {
      if (!pageId) return [];
      return fetchPageElements(pageId);
    },
  });
}
