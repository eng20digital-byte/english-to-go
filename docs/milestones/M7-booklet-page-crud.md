# M7 — Admin: Booklet & Page CRUD

## Goal
Admin can create, list, and manage booklets and their page sequence, without yet editing page content (elements).

## Scope
- `src/admin/BookletListPage.tsx` — list all booklets (admin sees draft + published via RLS), create new (title + auto-generated `public_token`), delete, toggle `status` draft/published.
- `src/admin/BookletEditorPage.tsx` — shell for a single booklet: shows its pages in order, add page, delete page, reorder pages (drag or up/down controls — pick the simpler one), toggle `is_quiz_page` on the last page.
- No element editing inside a page yet — clicking into a page just confirms it exists/navigates to a placeholder (M8 fills this in).

## Out of scope
No text boxes, no backgrounds, no quiz embed editor yet.

## Manual verification
1. Create a new booklet — appears in the list as `draft` with a generated token.
2. Add 3 pages, reorder them, delete one — confirm `page_order` stays consistent (no gaps/duplicates) after each operation.
3. Toggle the booklet to `published` — confirm it's now reachable at `/b/<token>` (showing whatever M5's reader renders for an empty-content booklet, even if visually blank).
4. Toggle back to `draft` — confirm `/b/<token>` reverts to not-found for anonymous sessions.
## Manual verification addition
5. After each reorder/delete operation in step 2, open the `pages` table directly in Supabase Studio and confirm `page_order` values are sequential integers with no gaps or duplicates — don't rely on the UI list order alone.