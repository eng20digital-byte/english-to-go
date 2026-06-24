// page_elements.props jsonb shapes, one per `type` — see CLAUDE.md
// "Structured content, not HTML". Adding a new element type is a pure
// app-layer addition: a new variant here + a new renderer registered in
// renderer/elements/registry.ts, zero DB migrations.

export type TextAlign = 'left' | 'right' | 'center';
export type TextDirection = 'rtl' | 'ltr' | 'auto';
export type BackgroundImageFit = 'cover' | 'contain';

export interface TextProps {
  content: string; // plain text; words are split at render time, not pre-tokenized
  font_id: string;
  font_size: number; // px, canvas-space (1920-wide reference)
  color: string;
  align: TextAlign;
  line_height: number;
  direction: TextDirection;
}

export interface BackgroundImageProps {
  media_asset_id: string;
  fit: BackgroundImageFit;
}

interface PageElementBase {
  id: string;
  page_id: string;
  z_index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
}

export type PageElement =
  | (PageElementBase & { type: 'text'; props: TextProps })
  | (PageElementBase & { type: 'background_image'; props: BackgroundImageProps });

export type ElementType = PageElement['type'];
