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
    return <p style={{ margin: 0, fontSize: 13, color: 'var(--destructive)' }}>Failed to load font file.</p>;
  }

  return (
    <p
      dir="rtl"
      lang="he"
      style={{
        fontFamily: status === 'loaded' ? familyName : undefined,
        fontSize: '2.5rem',
        margin: 0,
        textAlign: 'center',
        lineHeight: 1.3,
        // Fade in when the real font finishes loading — purely cosmetic
        opacity: status === 'loading' ? 0.35 : 1,
        transition: 'opacity 0.4s ease',
      }}
    >
      {FONT_PREVIEW_TEXT}
    </p>
  );
}
