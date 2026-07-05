# RP3 — Manage Users Page + Card Entry

**Goal:** The admin surface for per-recipient publication: a dedicated page listing
a booklet's recipients with add / publish-toggle / copy-link / rotate / delete, and
an entry point from the booklet card.

**Risk:** medium — new page + new route + card change, but all reuse existing shell
and control primitives.

## Scope

New files under `src/admin/booklets/`:
- `BookletUsersPage.tsx`
- `RecipientRow.tsx`
- `AddRecipientDialog.tsx`
- `RecipientStatusBadge.tsx`

Edits:
- `src/admin/routes.tsx` — register the route.
- `src/admin/booklets/BookletCard.tsx` — "Manage users (N)" button + relabel the
  existing public-link chip to "Master link (admin)".
- `src/hooks/useBookletQuery.ts` — add recipient count to `useBookletsQuery`.

## Change shape

### Route
```tsx
<Route path="/booklets/:bookletId/users" element={<BookletUsersPage />} />
```
Sits beside the existing `:bookletId` sub-routes; reads `useParams().bookletId`.

### `BookletUsersPage`
Standard shell (~15-line convention):
```tsx
<AdminPageShell variant="booklets">
  <AdminPageHeader accent="pink" backTo="/admin/booklets"
    backLabel="Back to Booklets" title={booklet.title}
    subtitle="Manage who can access this booklet. Each user gets their own link." />
  {/* Add user button + (search — RP5) + recipient list, or EmptyState */}
</AdminPageShell>
```
`EmptyState` ("No users have access yet", action = "Add user") when empty.

### `RecipientRow`
One recipient: name · `RecipientStatusBadge` · publish/unpublish toggle · copy-link
control (clone `readerUrl` + `handleCopy` "Copied" idiom from `BookletCard.tsx:9-49`)
· rotate-link · delete (right-pushed). Reuse `BTN_BASE` + `palette` from
`adminControls`. (Expiry control added in RP4.)

### `AddRecipientDialog`
shadcn `Dialog` (same pattern as the re-enable confirm,
`BookletListPage.tsx:316-332`) with a name field styled via `inputStyle()`.
(Optional expiry field added in RP4.)

### `RecipientStatusBadge`
Same visual language as `StatusBadge.tsx` (white pill + colored dot): Published =
green, Unpublished = muted. (Expired variant added in RP4.)

### Card entry point (`BookletCard.tsx`)
- Add a "Manage users (N)" button in the action row (before Delete) → navigate to
  `/admin/booklets/:id/users`.
- Relabel the "Public link" chip → "Master link (admin)" so it reads as distinct
  from recipient links.
- `N` comes from the count added to `useBookletsQuery` via a
  `booklet_recipients(count)` aggregate in the select (not an N+1 per card).

## Verification

1. Card shows "Manage users (0)"; click → lands on the users page (empty state).
2. Add "Dana", "Yossi", "Rivka" → three rows, each Unpublished with its own link.
3. Publish Dana + Rivka; open all three links → Dana/Rivka render, Yossi 404s.
4. Unpublish Dana → her link 404s immediately; Rivka still works.
5. Rotate Rivka's link → old link 404s, copied new link works.
6. Delete Yossi → row gone. Card count now "Manage users (2)".
7. "Master link (admin)" chip still copies the booklet's own `public_token` link
   and behaves exactly as before.
8. Lint + typecheck green.

## Out of scope

- Expiry dates (RP4). Bulk actions + search/pagination (RP5).
