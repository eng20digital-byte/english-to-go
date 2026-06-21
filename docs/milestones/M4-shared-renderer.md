# M4 — Shared Renderer Core

## Goal
`PageCanvas` and its element renderers exist and are proven correct against mock data, before either the editor or reader depends on them. This is the component both apps will import unmodified for the rest of the project.

## Scope
- `src/config/canvas.ts` — canvas width/height constants (1080×1920) and any other canvas-related constants (default font size, default colors, etc.) used across the renderer.
- `src/types/elements.ts` — `PageElement` discriminated union, `TextProps`, `BackgroundImageProps`.
- `src/renderer/useCanvasScale.ts` — `ResizeObserver`-based hook computing the scale factor for a container ref.
- `src/renderer/PageCanvas.tsx` — pure rendering component: `{ page, scale, renderMode }` → JSX, dispatches per-element by `type` via a registry.
- `src/renderer/elements/registry.ts` — `type` → component map.
- `src/renderer/elements/TextElement.tsx` — whitespace word-splitting into `<span data-word-index>`, RTL/`dir="auto"` handling, `white-space: pre-wrap`.
- `src/renderer/elements/BackgroundImageElement.tsx` — `cover`/`contain` fit.
- A throwaway dev route or Storybook-less test harness rendering `PageCanvas` against hardcoded mock `page`/`elements` data (mixed Hebrew/English text, a background image) — no Supabase dependency yet.

## Out of scope
No editor overlay, no DB-backed data, no TTS click behavior yet (word spans render but aren't wired to speech until M10).

## Manual verification
1. Render the mock harness at desktop width, tablet width, and mobile width — confirm the canvas maintains its 1080:1920 aspect ratio and all elements scale proportionally (no layout shift relative to each other).
2. Confirm mixed Hebrew/English text renders with correct RTL/LTR direction per segment.
3. Confirm background image `cover` vs `contain` both render correctly.
4. Resize the browser window live — confirm `useCanvasScale` updates smoothly with no flicker/jump.
5. Confirm the custom font (Andika New Basic) actually renders — not a fallback system font — by visually comparing glyph shapes, or checking DevTools → Network/Fonts that the WOFF2 file loaded successfully.