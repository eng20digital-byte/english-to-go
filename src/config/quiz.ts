// Quiz embed config (M11) — see CLAUDE.md "Quiz embed (final page)" for the
// reasoning behind each sandbox token.
export const QUIZ_IFRAME_SANDBOX =
  'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms';

// Default iframe height (px) for inline-style Fillout embeds, used wherever
// booklets.quiz_embed_height hasn't been set yet.
export const DEFAULT_QUIZ_EMBED_HEIGHT = 900;

// Inset (px) from the back cover portrait's bottom edge where the quiz
// trigger sits — see BookBackCover.tsx.
export const QUIZ_BACK_COVER_BOTTOM_INSET_PX = 200;

// Inset (px) from the back cover portrait's right edge where the quiz
// trigger sits — kept separate from the bottom inset so the button can be
// nudged horizontally without also shifting it vertically.
export const QUIZ_BACK_COVER_RIGHT_INSET_PX = 210;
