// Font registration config — keeps weight options and storage conventions
// out of components per CLAUDE.md "no magic numbers/hardcoded values" rule.
export const FONT_WEIGHTS = ['regular', 'bold', 'italic', 'bolditalic'] as const;
export type FontWeight = (typeof FONT_WEIGHTS)[number];

export const FONTS_STORAGE_BUCKET = 'fonts';
export const FONT_FILE_EXTENSION = '.woff2';

// Hebrew sentence used in the admin font preview to visually confirm an
// uploaded weight renders correctly (see M3 manual verification step).
export const FONT_PREVIEW_TEXT = 'abcd | אבגד';
