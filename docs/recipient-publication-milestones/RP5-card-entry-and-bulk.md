# RP5 — Bulk Actions + Search / Pagination

**Goal:** Make the manage-users page hold up at scale — bulk publish/unpublish,
copy-all-links, and server-side search + pagination for booklets with many
recipients.

**Risk:** low — additive UI + query params on existing hooks.

## Scope

- `src/admin/booklets/BookletUsersPage.tsx` — bulk-action bar + search field +
  pagination controls.
- `src/hooks/useBookletRecipientsQuery.ts` — accept search + range params; add
  bulk mutations.

## Change shape

### Bulk mutations
- `useBulkUpdateRecipientStatusMutation` — `update ... where id in (...)` (or
  `where booklet_id = ...` for "all") setting `status`.
- Reuse existing delete for multi-select delete (loop or `in (...)`).

### Bulk-action bar
Top of the list: **Publish all · Unpublish all · Copy all links** (joins each
recipient's `readerUrl` with newlines to the clipboard), plus row multi-select
(checkboxes) driving batch toggle / delete. Kept to a simple action bar over the
current (optionally filtered) list.

### Search + pagination
- `useBookletRecipientsQuery(bookletId, { search, page })` — apply
  `.ilike('name', '%'+search+'%')` and `.range(from, to)` server-side.
- Search field + prev/next (or page size) controls on the page. Index on
  `booklet_id` (RP0) keeps this efficient.

## Verification

1. With several recipients: "Publish all" flips every row to Published; "Unpublish
   all" flips them back.
2. "Copy all links" puts every recipient's URL on the clipboard (one per line).
3. Multi-select 2 rows → batch delete removes exactly those.
4. Search by name filters the list server-side; pagination pages through a long
   list without loading all rows.
5. Lint + typecheck green.

## Out of scope

- CLAUDE.md / docs close-out (RP6).
