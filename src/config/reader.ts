// Public reader-only constants (page-flip mechanics, layout, gestures). Per
// CLAUDE.md "no magic numbers in components" — see src/reader/PageFlip.tsx
// and ReaderBookletPage.tsx.

// Caps how wide the canvas grows on large desktop viewports; mobile/tablet
// just fill available width (container is `width: 100%`).
export const READER_MAX_WIDTH = 640;

export const PAGE_FLIP_DURATION_MS = 600;
export const PAGE_FLIP_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
export const PAGE_FLIP_PERSPECTIVE_PX = 2400;
// Max opacity of the dark shadow overlay on the flipping page, reached at
// the midpoint (90deg) of the rotation, for a sense of depth.
export const PAGE_FLIP_SHADOW_MAX_OPACITY = 0.35;

// A swipe commits to a page turn once it crosses either threshold (absolute
// px, useful on small screens; or a ratio of container width, useful on
// large screens) — whichever is reached first.
export const SWIPE_THRESHOLD_PX = 60;
export const SWIPE_THRESHOLD_RATIO = 0.15;

// Minimum horizontal pointer movement before a pointerdown is treated as a
// swipe-drag attempt and the pointer is captured (see PageFlip.tsx). Below
// this, it's left alone as a plain tap/click so word-click TTS (M10) and any
// other in-canvas click target keeps working — capturing on every
// pointerdown would redirect the resulting `click` event to this container
// instead of the element under the pointer.
export const DRAG_CAPTURE_THRESHOLD_PX = 10;
