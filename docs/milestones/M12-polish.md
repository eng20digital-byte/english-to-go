# M12 — Polish & UX

## Goal
A final pass making the reading experience feel finished, before considering V1 complete.

## Scope
- Cross-device QA of the reader, especially mobile portrait (the canvas is portrait-oriented, 1080×1920).
- Hebrew typography review at various font sizes (line-height, spacing) using the actual Andika New Basic font.
- Loading skeletons for the reader while booklet data fetches.
- 404/error states reviewed for consistency (unknown token, unpublished token, network error).
- Empty states in admin (no booklets yet, no fonts yet, no media yet).
- General pass on spacing/transitions for a "polished, modern" feel per the brief — scoped to what's reasonable, not a redesign.

## Out of scope
New features — this is a refinement pass on what M0–M11 already built.

## Manual verification
1. Walk through the full reader flow on an actual mobile device (or accurate emulation) — confirm comfortable reading, tap targets for words are reasonable size, page nav is easy to use one-handed.
2. Walk through the full admin flow (create booklet → add pages → add/style elements → set quiz embed → publish) start to finish without hitting a rough edge.
3. Confirm every loading/error/empty state designed in this milestone actually triggers and looks correct (slow network throttling in DevTools helps verify loading states).
