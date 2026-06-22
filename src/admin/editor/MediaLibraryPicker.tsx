import { useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { MEDIA_STORAGE_BUCKET, MEDIA_ACCEPTED_FILE_TYPES } from '@/config/media';
import {
  useMediaAssetsQuery,
  useUploadMediaAssetMutation,
  useDeleteMediaAssetMutation,
} from '@/hooks/useMediaLibraryQuery';
import type { MediaAssetRow } from '@/types/database';

// Standalone admin screen for M6 — not yet wired into the page editor
// (that's M8, where this component gets reused as an in-editor picker).
export function MediaLibraryPicker() {
  const { data: assets, isLoading } = useMediaAssetsQuery();
  const uploadAsset = useUploadMediaAssetMutation();
  const deleteAsset = useDeleteMediaAssetMutation();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file after an error
    if (!file) return;

    setUploadError(null);
    try {
      await uploadAsset.mutateAsync(file);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload image.');
    }
  }

  async function handleDelete(asset: MediaAssetRow) {
    setDeleteErrors((prev) => ({ ...prev, [asset.id]: '' }));
    try {
      await deleteAsset.mutateAsync(asset);
    } catch (error) {
      setDeleteErrors((prev) => ({
        ...prev,
        [asset.id]: error instanceof Error ? error.message : 'Failed to delete image.',
      }));
    }
  }

  return (
    <div id="admin-root" className="p-8">
      <Link to="/admin" className="text-sm text-muted-foreground hover:underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 mb-4 text-xl font-semibold">Media Library</h1>

      <label className="mb-8 flex max-w-sm flex-col gap-1">
        <span>Upload image</span>
        <input
          type="file"
          accept={MEDIA_ACCEPTED_FILE_TYPES}
          onChange={handleFileChange}
          disabled={uploadAsset.isPending}
          className="rounded-md border border-input px-3 py-2"
        />
      </label>
      {uploadAsset.isPending && <p className="mb-4 text-sm text-muted-foreground">Uploading…</p>}
      {uploadError && <p className="mb-4 text-sm text-destructive">{uploadError}</p>}

      <h2 className="mb-3 text-lg font-semibold">Images</h2>
      {isLoading && <p>Loading…</p>}
      {!isLoading && assets?.length === 0 && (
        <p className="text-muted-foreground">No images uploaded yet.</p>
      )}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {assets?.map((asset) => {
          const {
            data: { publicUrl },
          } = supabase.storage.from(MEDIA_STORAGE_BUCKET).getPublicUrl(asset.storage_path);

          return (
            <li key={asset.id} className="flex flex-col gap-2 rounded-md border border-input p-3">
              <img
                src={publicUrl}
                alt={asset.file_name}
                className="aspect-square w-full rounded object-cover"
              />
              <p className="truncate text-xs" title={asset.file_name}>
                {asset.file_name}
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(asset)}
                disabled={deleteAsset.isPending}
              >
                Delete
              </Button>
              {deleteErrors[asset.id] && (
                <p className="text-xs text-destructive">{deleteErrors[asset.id]}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
