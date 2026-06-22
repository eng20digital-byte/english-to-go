import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FONTS_STORAGE_BUCKET, FONT_PREVIEW_TEXT } from '@/config/fonts';
import type { FontRow } from '@/types/database';

interface FontPreviewProps {
  font: FontRow;
}

type LoadStatus = 'loading' | 'loaded' | 'error';

// Loads the registered font file directly via the CSS Font Loading API and
// renders sample text in it — makes the M3 manual-verification check (does
// each uploaded weight actually render?) a permanent part of the admin UI
// instead of a one-off throwaway page.
export function FontPreview({ font }: FontPreviewProps) {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const familyName = `font-preview-${font.id}`;

  useEffect(() => {
    let cancelled = false;

    const {
      data: { publicUrl },
    } = supabase.storage.from(FONTS_STORAGE_BUCKET).getPublicUrl(font.storage_path);
    const face = new FontFace(familyName, `url(${publicUrl})`);

    face
      .load()
      .then((loadedFace) => {
        if (cancelled) return;
        document.fonts.add(loadedFace);
        setStatus('loaded');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      document.fonts.delete(face);
    };
  }, [familyName, font.storage_path]);

  if (status === 'error') {
    return <p className="text-sm text-destructive">Failed to load font file.</p>;
  }

  return (
    <p
      dir="rtl"
      lang="he"
      style={{ fontFamily: status === 'loaded' ? familyName : undefined, fontSize: '1.25rem' }}
    >
      {FONT_PREVIEW_TEXT}
    </p>
  );
}
