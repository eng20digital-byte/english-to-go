import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { MEDIA_STORAGE_BUCKET } from '@/config/media';
import type { ReaderBooklet, ReaderBookletPage } from '@/hooks/useBookletQuery';
import type { PageElement } from '@/types/elements';
import type { MediaAssetRow } from '@/types/database';

// Preload background images from pages adjacent to the current spread so that
// page-flips in either direction are instant with no visible loading delay.
// Covers up to PRELOAD_AHEAD spreads forward and PRELOAD_BEHIND spreads back.
const PRELOAD_AHEAD = 4;
const PRELOAD_BEHIND = 4;

// Fire-and-forget: fetches the media_asset row into the React Query cache and
// kicks off the browser image download. Errors are silently swallowed.
async function preloadPageImages(
  page: ReaderBookletPage,
  queryClient: QueryClient,
  signal: { cancelled: boolean },
): Promise<void> {
  const bgElements = page.elements.filter(
    (el): el is Extract<PageElement, { type: 'background_image' }> =>
      el.type === 'background_image',
  );
  if (bgElements.length === 0) return;

  await Promise.all(
    bgElements.map(async (el) => {
      if (signal.cancelled) return;

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
          // Asset rows are immutable — never re-fetch if already cached.
          staleTime: Infinity,
        });
      } catch {
        return;
      }

      if (signal.cancelled) return;

      const {
        data: { publicUrl },
      } = supabase.storage.from(MEDIA_STORAGE_BUCKET).getPublicUrl(asset.storage_path);

      const img = new Image();
      img.src = publicUrl;
    }),
  );
}

export function usePagePreloader(
  booklet: ReaderBooklet | null | undefined,
  pageIndex: number,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!booklet) return;

    const cover = booklet.pages.find((p) => p.is_cover) ?? null;
    const spreads = cover ? booklet.pages.slice(1) : booklet.pages;
    const clampedIndex = Math.min(pageIndex, Math.max(0, spreads.length - 1));

    const signal = { cancelled: false };

    // Gather pages to preload: ahead first (higher priority for forward flips),
    // then behind. All start in parallel; the browser handles scheduling.
    const offsets: number[] = [];
    for (let i = 1; i <= PRELOAD_AHEAD; i++) offsets.push(i);
    for (let i = 1; i <= PRELOAD_BEHIND; i++) offsets.push(-i);

    const pages = offsets
      .map((o) => spreads[clampedIndex + o])
      .filter((p): p is ReaderBookletPage => p != null);

    Promise.all(pages.map((p) => preloadPageImages(p, queryClient, signal))).catch(() => {});

    return () => {
      signal.cancelled = true;
    };
  }, [booklet, pageIndex, queryClient]);
}
