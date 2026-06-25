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

// A single vocabulary pair rendered as one bubble: `english - hebrew`.
// The whole vocabulary list is ONE page element (not one element per word) —
// see VocabularyElement.tsx — so the words live here in props, mirroring how
// TextProps.content holds all of a text box's text.
export interface VocabularyWord {
  english: string;
  hebrew: string;
}

export interface VocabularyProps {
  words: VocabularyWord[];
  // Whether the bubbles render on the page itself in the reader. When false,
  // the words are hidden from the canvas but still feed the reader's
  // VocabularyPanel — "turn off the on-page display without losing the data".
  // Optional for backward-compat: elements saved before this prop existed are
  // treated as visible (see VocabularyElement / ElementInspector).
  show_on_page?: boolean;
  // Two separate font_ids so English and Hebrew can each use an
  // appropriate face (same `fonts` table / font_id mechanism as TextProps).
  english_font_id: string;
  hebrew_font_id: string;
  font_size: number; // px, canvas-space
  text_color: string;
  // Bubble (chip) styling — applied identically to every word bubble.
  bubble_background_color: string;
  bubble_border_color: string;
  bubble_border_width: number; // px
  bubble_border_radius: number; // px (large value => pill)
  bubble_padding_x: number; // px, horizontal padding inside each bubble
  bubble_padding_y: number; // px, vertical padding inside each bubble
  bubble_spacing: number; // px gap between bubbles (flex gap, both axes)
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
  | (PageElementBase & { type: 'background_image'; props: BackgroundImageProps })
  | (PageElementBase & { type: 'vocabulary'; props: VocabularyProps });

export type ElementType = PageElement['type'];
