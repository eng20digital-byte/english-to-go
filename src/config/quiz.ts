// Quiz embed config (M11) — see CLAUDE.md "Quiz embed (final page)" for the
// reasoning behind each sandbox token.
export const QUIZ_IFRAME_SANDBOX =
  'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms';

// Default iframe height (px) for inline-style Fillout embeds, used wherever
// booklets.quiz_embed_height hasn't been set yet.
export const DEFAULT_QUIZ_EMBED_HEIGHT = 900;

// The embed sits centered along the lower edge of the back cover and scales
// down on narrow screens so it stays within the portrait bounds.
export const QUIZ_BACK_COVER_MIN_SCALE = 0.72;
export const QUIZ_BACK_COVER_MAX_SCALE = 1;
export const QUIZ_BACK_COVER_SCALE_BREAKPOINT = 520;
