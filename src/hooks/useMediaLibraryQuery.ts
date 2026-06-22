import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { compressImage } from '@/lib/imageCompression';
import {
  MEDIA_STORAGE_BUCKET,
  MEDIA_OUTPUT_FILE_EXTENSION,
  MEDIA_OUTPUT_MIME_TYPE,
} from '@/config/media';
import type { MediaAssetRow } from '@/types/database';

// Admin-only: full library list + upload/delete mutations. Kept separate
// from hooks/useMediaAssetQuery.ts, which is the single-asset-by-id lookup
// used by the (admin + reader) shared renderer.
const MEDIA_ASSETS_QUERY_KEY = ['media-assets'] as const;

export function useMediaAssetsQuery() {
  return useQuery({
    queryKey: MEDIA_ASSETS_QUERY_KEY,
    queryFn: async (): Promise<MediaAssetRow[]> => {
      const { data, error } = await supabase
        .from('media_assets')
        .select('id, storage_path, file_name, width, height, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

async function uploadMediaAsset(file: File): Promise<MediaAssetRow> {
  const { blob, width, height } = await compressImage(file);

  const id = crypto.randomUUID();
  const storagePath = `${MEDIA_STORAGE_BUCKET}/${id}${MEDIA_OUTPUT_FILE_EXTENSION}`;

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_STORAGE_BUCKET)
    .upload(storagePath, blob, { contentType: MEDIA_OUTPUT_MIME_TYPE });
  if (uploadError) throw uploadError;

  const { data, error: insertError } = await supabase
    .from('media_assets')
    .insert({ id, storage_path: storagePath, file_name: file.name, width, height })
    .select('id, storage_path, file_name, width, height, created_at')
    .single();
  if (insertError) {
    // Storage and the DB aren't transactional together — without this, a
    // failed insert would leave an orphaned file behind with no row pointing at it.
    await supabase.storage.from(MEDIA_STORAGE_BUCKET).remove([storagePath]);
    throw insertError;
  }
  return data;
}

export function useUploadMediaAssetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadMediaAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_ASSETS_QUERY_KEY });
    },
  });
}

async function deleteMediaAsset(asset: Pick<MediaAssetRow, 'id' | 'storage_path'>): Promise<void> {
  const { error } = await supabase.rpc('delete_media_asset', { id: asset.id });
  if (error) {
    if (error.message.includes('still referenced')) {
      throw new Error("Can't delete — this image is still used on a page.");
    }
    throw error;
  }

  // The RPC only removes the DB row (it's the part that needs the "still
  // referenced" guard); the file is a separate cleanup step the admin's own
  // is_admin() storage policy already allows.
  await supabase.storage.from(MEDIA_STORAGE_BUCKET).remove([asset.storage_path]);
}

export function useDeleteMediaAssetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMediaAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_ASSETS_QUERY_KEY });
    },
  });
}
