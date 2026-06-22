import type { ComponentType, ReactElement } from 'react';
import type { PageElement } from '@/types/elements';
import { TextElement } from './TextElement';
import { BackgroundImageElement } from './BackgroundImageElement';

// 'editor' vs 'reader' only toggles behavior intrinsic to rendering — e.g.
// word-spans are click-active for TTS in 'reader' only — see CLAUDE.md
// "Shared renderer — never fork this".
export type RenderMode = 'editor' | 'reader';

export interface ElementRendererProps<T extends PageElement = PageElement> {
  element: T;
  renderMode: RenderMode;
}

// type -> component map. Adding a new element type is a pure addition here
// plus a new variant in types/elements.ts, zero DB migrations.
const elementRegistry: {
  [K in PageElement['type']]: ComponentType<ElementRendererProps<Extract<PageElement, { type: K }>>>;
} = {
  text: TextElement,
  background_image: BackgroundImageElement,
};

// Dynamically indexing elementRegistry by `element.type` loses the
// correlation TS needs between the key and that variant's props — this is
// the single, narrow place that bridges it, so the cast doesn't need to be
// repeated at every call site.
export function renderElement(element: PageElement, renderMode: RenderMode): ReactElement {
  const Component = elementRegistry[element.type] as ComponentType<ElementRendererProps>;
  return <Component element={element} renderMode={renderMode} />;
}
