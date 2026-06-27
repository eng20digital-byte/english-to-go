import { useCallback, useRef, useState } from 'react';
import { CLIPBOARD_PASTE_OFFSET } from '@/config/editor';
import type { PageElement } from '@/types/elements';

// Global (editor-wide) element clipboard. It must outlive the per-page editor,
// which remounts on every page switch (PageElementEditor is key={pageId}), so
// this hook is owned by BookletEditorPage and passed down — that's what lets a
// copy on page A paste onto page B. State holds a *deep clone* of the copied
// elements so later edits to the live originals never mutate the clipboard, and
// each paste clones again so the pasted elements are independent of both.

export interface ElementClipboard {
  /** True when there is something to paste — drives enabled state of paste UI. */
  hasElements: boolean;
  /** Copy (deep-clone) the given elements; resets the paste cascade. */
  copy: (elements: PageElement[]) => void;
  /**
   * Build fresh, page-ready elements for a paste: new unique ids, page_id set
   * to the target page, z_index stacked on top from `baseZIndex`, and a
   * cascading x/y offset so consecutive pastes don't stack invisibly. Returns
   * `[]` when the clipboard is empty.
   */
  takePaste: (targetPageId: string, baseZIndex: number) => PageElement[];
  /** Empty the clipboard. */
  clear: () => void;
}

function cloneElement(element: PageElement): PageElement {
  // structuredClone deep-copies the polymorphic `props` too (e.g. the
  // vocabulary `words` array), so no nested reference is shared with the source.
  return structuredClone(element);
}

export function useElementClipboard(): ElementClipboard {
  const [items, setItems] = useState<PageElement[]>([]);
  // Number of times the current clipboard content has been pasted. A ref (not
  // state) because the cascade offset must advance without triggering a render.
  const pasteCountRef = useRef(0);

  const copy = useCallback((elements: PageElement[]) => {
    setItems(elements.map(cloneElement));
    pasteCountRef.current = 0;
  }, []);

  const takePaste = useCallback(
    (targetPageId: string, baseZIndex: number): PageElement[] => {
      if (items.length === 0) return [];
      pasteCountRef.current += 1;
      const offset = CLIPBOARD_PASTE_OFFSET * pasteCountRef.current;
      return items.map((element, index) => ({
        ...cloneElement(element),
        id: crypto.randomUUID(),
        page_id: targetPageId,
        x: element.x + offset,
        y: element.y + offset,
        z_index: baseZIndex + index,
      })) as PageElement[];
    },
    [items],
  );

  const clear = useCallback(() => {
    setItems([]);
    pasteCountRef.current = 0;
  }, []);

  return { hasElements: items.length > 0, copy, takePaste, clear };
}
