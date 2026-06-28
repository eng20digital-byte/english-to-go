import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { MEDIA_STORAGE_BUCKET } from '@/config/media';
import type { ReaderBooklet } from '@/hooks/useBookletQuery';
import type { PageElement } from '@/types/elements';
import type { MediaAssetRow } from '@/types/database';

// While the reader displays spread N, prefetch spread N+1's background image(s)
// so the flip animation is instant with no visual loading delay.
//
// Two things are prefetched:
//  1. The media_assets DB row — primes the React Query cache so
//     BackgroundImageElement skips its own round-trip when it mounts.
//  2. The actual image bytes — via a hidden Image() that lets the browser
//     download and cache the file before it's needed.
//
// Failures are silently swallowed; preloading is best-effort.
export function useNextPagePreloader(
  booklet: ReaderBooklet | null | undefined,
  pageIndex: number,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!booklet) return;

    const cover = booklet.pages.find((p) => p.is_cover) ?? null;
    const spreads = cover ? booklet.pages.slice(1) : booklet.pages;
    const clampedIndex = Math.min(pageIndex, Math.max(0, spreads.length - 1));
    const nextPage = spreads[clampedIndex + 1];
    if (!nextPage) return;

    const bgElements = nextPage.elements.filter(
      (el): el is Extract<PageElement, { type: 'background_image' }> =>
        el.type === 'background_image',
    );
    if (bgElements.length === 0) return;

    let cancelled = false;

    async function preload() {
      for (const el of bgElements) {
        if (cancelled) return;

        const mediaAssetId = el.props.media_asset_id;

        let asset: MediaAssetRow;
        try {
          asset = await queryClient.fetchQuery<MediaAssetRow>({
            queryKey: ['media-asset', mediaAssetId],
            queryFn: async () => {
              const { data, error } = await supabase
                .from('media_assets')
                .select('id, storage_path, file_name, width, height, created_at')
                .eq('id', mediaAssetId)
                .single();
              if (error) throw error;
              return data;
            },
            // Never re-fetch if the asset row is already in cache — it's immutable.
            staleTime: Infinity,
          });
        } catch {
          continue;
        }

        if (cancelled) return;

        const {
          data: { publicUrl },
        } = supabase.storage.from(MEDIA_STORAGE_BUCKET).getPublicUrl(asset.storage_path);

        const img = new Image();
        img.src = publicUrl;
      }
    }

    preload().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [booklet, pageIndex, queryClient]);
}
