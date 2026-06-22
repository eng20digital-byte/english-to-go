import { supabase } from '@/lib/supabaseClient';
import { MEDIA_STORAGE_BUCKET } from '@/config/media';
import { useMediaAssetQuery } from '@/hooks/useMediaAssetQuery';
import type { PageElement } from '@/types/elements';
import type { ElementRendererProps } from './registry';

type Props = ElementRendererProps<Extract<PageElement, { type: 'background_image' }>>;

export function BackgroundImageElement({ element }: Props) {
  const { data: asset, isPending, isError } = useMediaAssetQuery(element.props.media_asset_id);

  if (isPending || isError || !asset) {
    return <div style={{ width: '100%', height: '100%', backgroundColor: '#e5e5e5' }} />;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(MEDIA_STORAGE_BUCKET).getPublicUrl(asset.storage_path);

  return (
    <img
      src={publicUrl}
      alt=""
      style={{
        width: '100%',
        height: '100%',
        objectFit: element.props.fit,
        display: 'block',
      }}
    />
  );
}
