# M7 — Admin: Booklet & Page CRUD

## Goal
Admin can create, list, and manage booklets and their page sequence, without yet editing page content (elements).

## Scope
- `src/admin/BookletListPage.tsx` — list all booklets (admin sees all statuses via RLS), create new (title + auto-generated `public_token`), delete, toggle `status` draft/published, and visibly distinguish `disabled` from `draft` (e.g. a distinct badge/label — both are publicly invisible but mean different things to the admin, see CLAUDE.md §4).
- Disable action: available only when `status = 'published'`, sets it to `disabled`. No confirmation needed — this only *removes* access, the safer direction.
- Re-enable action: available only when `status = 'disabled'`, sets it back to `published`. Requires an explicit confirm step (dialog: "This restores public access at the existing link. Continue?") — restoring access at an already-known link is the higher-cost mistake, unlike a fresh draft's first publish where nobody has the link yet.
- `src/admin/BookletEditorPage.tsx` — shell for a single booklet: shows its pages in order, add page, delete page, reorder pages (drag or up/down controls — pick the simpler one), toggle `is_quiz_page` on the last page.
- No element editing inside a page yet — clicking into a page just confirms it exists/navigates to a placeholder (M8 fills this in).

## Out of scope
No text boxes, no backgrounds, no quiz embed editor yet.

## Manual verification
1. Create a new booklet — appears in the list as `draft` with a generated token.
2. Add 3 pages, reorder them, delete one — confirm `page_order` stays consistent (no gaps/duplicates) after each operation.
3. Toggle the booklet to `published` — confirm it's now reachable at `/b/<token>` (showing whatever M5's reader renders for an empty-content booklet, even if visually blank).
4. Toggle back to `draft` — confirm `/b/<token>` reverts to not-found for anonymous sessions.
5. Publish the booklet again, then use the "disable" action — confirm `/b/<token>` reverts to not-found for anonymous sessions (same as draft), and that the list shows it as `disabled`, visually distinct from `draft`.
6. Use the "re-enable" action on the disabled booklet — confirm a confirmation dialog appears before access is restored, and that after confirming, `/b/<token>` is reachable again at the *same* token (no new token generated).
## Manual verification addition
5. After each reorder/delete operation in step 2, open the `pages` table directly in Supabase Studio and confirm `page_order` values are sequential integers with no gaps or duplicates — don't rely on the UI list order alone.