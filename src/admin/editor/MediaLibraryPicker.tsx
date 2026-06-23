import { useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/Spinner';
import { supabase } from '@/lib/supabaseClient';
import { MEDIA_STORAGE_BUCKET, MEDIA_ACCEPTED_FILE_TYPES } from '@/config/media';
import {
  useMediaAssetsQuery,
  useUploadMediaAssetMutation,
  useDeleteMediaAssetMutation,
} from '@/hooks/useMediaLibraryQuery';
import type { MediaAssetRow } from '@/types/database';

interface MediaLibraryPickerProps {
  // When provided, renders a "Select" affordance per image and omits the
  // standalone screen's back-link/heading — M8's "Add background image"
  // embeds this same component (M6's admin screen) inside a modal instead
  // of forking a second picker UI.
  onSelect?: (asset: MediaAssetRow) => void;
}

// Six placeholder tiles matching the grid shape while assets load.
function MediaGridSkeleton() {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex flex-col gap-2 rounded-md border border-input p-3">
          <div className="aspect-square w-full animate-pulse rounded bg-neutral-200" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-neutral-100" />
          <div className="h-7 w-full animate-pulse rounded-md bg-neutral-100" />
        </li>
      ))}
    </ul>
  );
}

function EmptyMedia({ embedded }: { embedded: boolean }) {
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 text-center ${embedded ? 'py-10' : 'py-14'}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
        <ImageIcon className="h-5 w-5 text-neutral-400" />
      </div>
      <div>
        <p className="font-medium text-neutral-700">No images uploaded yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload an image using the file input above.
        </p>
      </div>
    </div>
  );
}

export function MediaLibraryPicker({ onSelect }: MediaLibraryPickerProps = {}) {
  const { data: assets, isLoading } = useMediaAssetsQuery();
  const uploadAsset = useUploadMediaAssetMutation();
  const deleteAsset = useDeleteMediaAssetMutation();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const embedded = !!onSelect;

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

  const content = (
    <>
      <label className="mb-6 flex max-w-sm flex-col gap-1">
        <span className="text-sm font-medium">Upload image</span>
        <input
          type="file"
          accept={MEDIA_ACCEPTED_FILE_TYPES}
          onChange={handleFileChange}
          disabled={uploadAsset.isPending}
          className="rounded-md border border-input px-3 py-2 text-sm"
        />
      </label>

      {uploadAsset.isPending && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" />
          <span>Uploading…</span>
        </div>
      )}
      {uploadError && <p className="mb-4 text-sm text-destructive">{uploadError}</p>}

      <h2 className="mb-4 text-lg font-semibold">Images</h2>

      {isLoading && <MediaGridSkeleton />}
      {!isLoading && assets?.length === 0 && <EmptyMedia embedded={embedded} />}

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {assets?.map((asset) => {
          const {
            data: { publicUrl },
          } = supabase.storage.from(MEDIA_STORAGE_BUCKET).getPublicUrl(asset.storage_path);

          return (
            <li
              key={asset.id}
              className="flex flex-col gap-2 rounded-md border border-input p-3 transition-shadow hover:shadow-sm"
            >
              <img
                src={publicUrl}
                alt={asset.file_name}
                className="aspect-square w-full rounded object-cover"
              />
              <p className="truncate text-xs" title={asset.file_name}>
                {asset.file_name}
              </p>
              {onSelect && (
                <Button size="sm" onClick={() => onSelect(asset)}>
                  Select
                </Button>
              )}
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
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <div id="admin-root" className="p-8">
      <Link to="/admin" className="text-sm text-muted-foreground hover:underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 mb-6 text-xl font-semibold">Media Library</h1>
      {content}
    </div>
  );
}
