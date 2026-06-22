import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { MediaAssetRow } from '@/types/database';

// Keyed by id rather than fetching the whole library — a page only ever
// references a handful of distinct media assets, so per-id caching avoids
// pulling in assets the current view doesn't need.
export function useMediaAssetQuery(mediaAssetId: string) {
  return useQuery({
    queryKey: ['media-asset', mediaAssetId],
    queryFn: async (): Promise<MediaAssetRow> => {
      const { data, error } = await supabase
        .from('media_assets')
        .select('id, storage_path, file_name, width, height, created_at')
        .eq('id', mediaAssetId)
        .single();
      if (error) throw error;
      return data;
    },
  });
}
