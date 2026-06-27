import { useCallback, useState } from 'react';
import type { PageElement } from '@/types/elements';

// Global (editor-wide) page clipboard. Unlike the element clipboard, a copied
// page's *content* is captured in memory at copy/cut time — not just a reference
// to a page id — because Cut deletes the source page from the DB, and Paste must
// still be able to recreate it afterwards. Persistence/new-id generation happens
// server-side in the insert_page_with_elements RPC; this only holds the payload.

export interface PageClipboardData {
  // Full element payload of the copied page. Ids/page_ids here are the source's;
  // the paste RPC ignores them and mints fresh ones (same as save_page_elements).
  elements: PageElement[];
  // Preserved page metadata. The RPC re-enforces "only the last page may be the
  // quiz page", so this only ends up applied when the paste lands as the last page.
  isQuizPage: boolean;
}

export interface PageClipboard {
  /** True when there is a page available to paste — drives paste UI enabled state. */
  hasPage: boolean;
  data: PageClipboardData | null;
  copy: (data: PageClipboardData) => void;
  clear: () => void;
}

export function usePageClipboard(): PageClipboard {
  const [data, setData] = useState<PageClipboardData | null>(null);

  const copy = useCallback((next: PageClipboardData) => setData(next), []);
  const clear = useCallback(() => setData(null), []);

  return { hasPage: data !== null, data, copy, clear };
}
