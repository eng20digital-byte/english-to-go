import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AUTOSAVE_DEBOUNCE_MS } from '@/config/editor';
import type { PageElement } from '@/types/elements';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Debounced persistence of the editor reducer's element array via the
// save_page_elements RPC (transactional delete+reinsert — see
// supabase/migrations/0001_init.sql). `enabled` should only flip true once
// the reducer has been seeded from the initial load (PageElementEditor's
// SET_ELEMENTS), so that load itself is never mistaken for an edit and
// re-saved as a no-op.
export function useAutosave(pageId: string | undefined, elements: PageElement[], enabled: boolean) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timeoutRef = useRef<number | null>(null);
  const latestElementsRef = useRef(elements);
  const dirtyRef = useRef(false);
  const baselineSetRef = useRef(false);

  // Mirrors `elements` into a ref so performSave (invoked from a debounce
  // timeout or an unmount cleanup, both outside render) always reads the
  // latest array without itself being a render-time effect dependency.
  // Assigning ref.current must happen in an effect, not during render.
  useEffect(() => {
    latestElementsRef.current = elements;
  }, [elements]);

  const performSave = useCallback(async () => {
    if (!pageId) return;
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    dirtyRef.current = false;
    setStatus('saving');

    const { error } = await supabase.rpc('save_page_elements', {
      page_id: pageId,
      elements: latestElementsRef.current,
    });
    setStatus(error ? 'error' : 'saved');
  }, [pageId]);

  useEffect(() => {
    if (!enabled) return;

    // The first render after `enabled` flips true is the just-loaded
    // baseline, not a user edit — skip scheduling a save for it.
    if (!baselineSetRef.current) {
      baselineSetRef.current = true;
      return;
    }

    dirtyRef.current = true;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      void performSave();
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, [elements, enabled, performSave]);

  // Safety net: flush a pending change immediately when this editor instance
  // unmounts (route change / page switch within the booklet — PageElementEditor
  // is keyed by pageId, so switching pages remounts it). The save call isn't
  // awaited here since cleanup can't be async, but the network request fires
  // synchronously and is not tied to the component's lifecycle, so it
  // completes even after unmount.
  useEffect(() => {
    return () => {
      if (dirtyRef.current) void performSave();
    };
  }, [performSave]);

  // Awaitable flush used before page-level operations (copy/cut/duplicate of the
  // page currently open in the editor) read this page's elements back from the
  // DB: it guarantees the latest in-memory edits are persisted first, so those
  // ops never capture a stale, pre-debounce snapshot. No-op when nothing is
  // pending, so calling it defensively before every such op is cheap.
  const flushIfDirty = useCallback(async () => {
    if (dirtyRef.current) await performSave();
  }, [performSave]);

  return { status, saveNow: performSave, flushIfDirty };
}
