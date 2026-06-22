import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FONTS_STORAGE_BUCKET } from '@/config/fonts';

type LoadStatus = 'loading' | 'loaded' | 'error';

function isFamilyLoaded(familyName: string): boolean {
  return [...document.fonts].some((face) => face.family === familyName && face.status === 'loaded');
}

// Loads a registered font file via the CSS Font Loading API under a
// deterministic family name, so any number of TextElement instances
// referencing the same font_id converge on one loaded @font-face instead of
// each fetching/registering it again.
export function useFontFace(storagePath: string | undefined, familyName: string) {
  const [status, setStatus] = useState<LoadStatus>(() => (isFamilyLoaded(familyName) ? 'loaded' : 'loading'));

  // Re-derive status synchronously during render when familyName changes
  // (e.g. a different font picked for the same element) — adjusting state
  // here instead of in the effect avoids a same-effect setState-on-mount
  // lint warning for the already-loaded case below.
  const [trackedFamilyName, setTrackedFamilyName] = useState(familyName);
  if (familyName !== trackedFamilyName) {
    setTrackedFamilyName(familyName);
    setStatus(isFamilyLoaded(familyName) ? 'loaded' : 'loading');
  }

  useEffect(() => {
    if (!storagePath || isFamilyLoaded(familyName)) return;
    let cancelled = false;

    const {
      data: { publicUrl },
    } = supabase.storage.from(FONTS_STORAGE_BUCKET).getPublicUrl(storagePath);
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
    };
  }, [storagePath, familyName]);

  return status;
}
