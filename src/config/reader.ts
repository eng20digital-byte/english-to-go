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

// ── Physical book thickness (page-stack edges) ─────────────────────────────
// Stacked-paper edges drawn just OUTSIDE the open book's left/right sides (see
// ReaderBookletPage.tsx + the `.book-edge` rule in src/index.css). Every page
// contributes exactly ONE extremely thin sheet, so a stack's width is simply
// its sheet count × this thickness: the LEFT stack grows by a sheet for each
// page turned while the RIGHT stack shrinks by one, so both sides accurately
// reflect how many pages sit on each. Kept tiny so the stack thickens gradually,
// page by page, rather than reading as one solid block. The same value is
// exposed to CSS as the `--book-sheet-thickness` custom property so the
// fore-edge gradient draws exactly one cut-line per sheet. Edges run the full
// page height (top to bottom) and switch with no transition — see
// ReaderBookletPage.tsx.
export const BOOK_SHEET_THICKNESS_PX = 0.7;

// Stacked-paper depth illusion: each page deeper in the stack is clipped
// by this many percent of the card height from BOTH top and bottom, making
// pages farther from the current spread appear slightly shorter/recessed.
// 0.5 % ~~ 1 mm at typical screen sizes (1080p card ~675 px tall).
// Applied via clip-path polygon on the stack div -- no extra DOM nodes.
export const BOOK_STACK_DEPTH_INSET_PCT = 0.5;

// ── Page-flip sound effect ──────────────────────────────────────────────────
// Pool of pre-loaded Audio instances so rapid successive flips don't cut each
// other off — each flip picks the next slot, rewinds it, and plays.
export const PAGE_FLIP_SOUND_SRC = '/flip.mp3';
export const PAGE_FLIP_SOUND_POOL_SIZE = 6;
// Subtle volume so the effect enhances without distracting.
export const PAGE_FLIP_SOUND_VOLUME = 0.3;
// The clip opens with a soft lead-in, which made the audible flip "snap" land
// noticeably after the animation had already started. Each playback seeks to
// this offset (seconds) so the meaty part of the sound hits in sync with the
// page turn instead of trailing it.
export const PAGE_FLIP_SOUND_START_OFFSET_SEC = 0.5;

