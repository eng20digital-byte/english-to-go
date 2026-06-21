# M5 — Public Reader (Read-Only)

## Goal
An anonymous visitor can open a published booklet by its public token and read through its pages, rendered via the real `PageCanvas` from M4 with real Supabase data.

## Scope
- `src/hooks/useBookletQuery.ts` — React Query hooks: fetch booklet by `public_token` (with its pages, elements, and referenced fonts/media joined or fetched alongside).
- `src/reader/ReaderBookletPage.tsx` — loads booklet by token from the route, renders the current page through `PageCanvas` (`renderMode="reader"`).
- `src/reader/PageNav.tsx` — prev/next controls + page indicator.
- `@font-face` registration for any fonts referenced by the booklet's text elements (loaded dynamically based on `font_id`s present).
- 404/empty state for an unknown or unpublished token (do not leak whether a token exists vs. is just unpublished — same generic "not found" message for both, since RLS already returns nothing for non-published in either case).

## Out of scope
No quiz page rendering yet (M11), no TTS click behavior yet (M10) — page navigation and visual rendering only.

## Manual verification
1. In Supabase Studio, manually create a `published` test booklet with 2–3 pages and a few text/background elements (or use the M1 test data).
2. Visit `/b/<token>` while logged out — confirm the booklet renders correctly, matches the data, and page nav works.
3. Manually flip the test booklet to `draft` — confirm `/b/<token>` now shows the not-found state for an anonymous session.
4. Visit `/b/some-made-up-token` — confirm the same not-found state (no distinguishable error for "doesn't exist" vs "not published").
5.Confirm the custom font (Andika New Basic) actually renders — not a fallback system font — by visually comparing glyph shapes, or checking DevTools → Network/Fonts that the WOFF2 file loaded successfully.