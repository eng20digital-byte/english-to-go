import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { MEDIA_STORAGE_BUCKET } from '@/config/media';
import type { ReaderBooklet } from '@/hooks/useBookletQuery';
import type { PageElement } from '@/types/elements';
import type { MediaAssetRow } from '@/types/database';

// Returns a promise that resolves once the image is loaded (or fails). Handles
// the already-cached case: if img.complete is true right after setting src,
// onload may or may not fire depending on the browser, so we resolve eagerly.
function loadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
    if (img.complete) resolve();
  });
}

// Tracks whether the first thing the reader will display — the cover page (if
// the booklet has one) or the first spread — has its background image(s) fully
// downloaded. Returns false while loading, true once all images are ready (or
// if there are no background images to wait for).
//
// Used by ReaderBookletPage to extend the LoadingState skeleton until the
// opening visual is pixel-ready, preventing a flash of gray placeholder.
export function useCoverImageReady(booklet: ReaderBooklet | null | undefined): boolean {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!booklet) return;

    const cover = booklet.pages.find((p) => p.is_cover) ?? null;
    const spreads = cover ? booklet.pages.slice(1) : booklet.pages;

    // First visible page: the cover (while closed) or the first spread (no cover).
    const firstVisible = cover ?? spreads[0];
    if (!firstVisible) {
      setReady(true);
      return;
    }

    const bgElements = firstVisible.elements.filter(
      (el): el is Extract<PageElement, { type: 'background_image' }> =>
        el.type === 'background_image',
    );

    if (bgElements.length === 0) {
      setReady(true);
      return;
    }

    let cancelled = false;

    async function waitForImages() {
      await Promise.all(
        bgElements.map(async (el) => {
          let asset: MediaAssetRow;
          try {
            asset = await queryClient.fetchQuery<MediaAssetRow>({
              queryKey: ['media-asset', el.props.media_asset_id],
              queryFn: async () => {
                const { data, error } = await supabase
                  .from('media_assets')
                  .select('id, storage_path, file_name, width, height, created_at')
                  .eq('id', el.props.media_asset_id)
                  .single();
                if (error) throw error;
                return data;
              },
              staleTime: Infinity,
            });
          } catch {
            return; // count as done; don't block the reader on a DB error
          }

          if (cancelled) return;

          const {
            data: { publicUrl },
          } = supabase.storage.from(MEDIA_STORAGE_BUCKET).getPublicUrl(asset.storage_path);

          await loadImage(publicUrl);
        }),
      );

      if (!cancelled) setReady(true);
    }

    setReady(false);
    waitForImages().catch(() => {
      if (!cancelled) setReady(true); // fail open — never block the reader indefinitely
    });

    return () => {
      cancelled = true;
    };
  }, [booklet, queryClient]);

  return ready;
}
