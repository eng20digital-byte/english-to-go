// Public reader-only constants (page-flip mechanics, layout, gestures). Per
// CLAUDE.md "no magic numbers in components" — see src/reader/PageFlip.tsx
// and ReaderBookletPage.tsx.

// Caps how wide the canvas grows on very large desktop viewports; fills
// available width otherwise (container is `width: 100%`). Set to the canvas's
// native width (1920) so the booklet fills the viewport at maximum scale — any
// display narrower than 1920px is already constrained by available width + the
// 3vw horizontal margin in ReaderBookletPage, so the cap only applies to
// ultrawide monitors (>2560px-class screens).
export const READER_MAX_WIDTH = 1920;

export const PAGE_FLIP_DURATION_MS = 1000;
// Smooth ease-in-out-cubic: slight resistance at the start, flows through the
// midpoint, then settles gently — mimics paper's physical inertia.
export const PAGE_FLIP_EASING = 'cubic-bezier(0.37, 0, 0.63, 1)';
// Perspective depth for the page turn. The leaf is now a HALF-width page (only
// the right half folds around the centre spine), so its free edge sweeps a
// tighter arc — a smaller perspective gives more realistic depth for the
// half-page turn without flattening it. Smaller = more dramatic 3D; larger =
// flatter/orthographic.
export const PAGE_FLIP_PERSPECTIVE_PX = 1400;
// Peak opacity of the shading overlay on the turning leaf, reached at the
// edge-on midpoint (90deg) where the page tilts furthest from the light.
// Slightly stronger now — the half-page fold reads more dramatically.
export const PAGE_FLIP_SHADOW_MAX_OPACITY = 0.45;

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
