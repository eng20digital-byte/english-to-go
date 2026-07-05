# RP4 — Expiry Dates

**Goal:** Let each recipient link carry an optional future expiry date. Once
passed, the link auto-unpublishes (server-enforced by the RP0 RPC); the admin UI
reflects "Expired" immediately, and setting a new future date re-publishes.

**Risk:** low — additive mutation + UI controls; the server-side expiry check
already shipped in RP0.

## Scope

- `src/hooks/useBookletRecipientsQuery.ts` — add `useUpdateRecipientExpiryMutation`.
- `src/config/booklets.ts` (or `config/recipients.ts`) + a small pure helper —
  `recipientEffectiveStatus`.
- `src/admin/booklets/RecipientRow.tsx` — date control + "Active until / Expired".
- `src/admin/booklets/AddRecipientDialog.tsx` — optional expiry field on create.
- `src/admin/booklets/RecipientStatusBadge.tsx` — "Expired" variant.

## Change shape

### `useUpdateRecipientExpiryMutation`
Updates `expires_at`. **If the new date is in the future, also set `status =
'published'`** (matches "changing the date again makes it live again"). Clearing
the date (`null`) leaves the current `status` untouched. Guard future-only in the
mutation (belt-and-suspenders with the UI `min`).

### Effective-status helper (pure)
```ts
type EffectiveStatus = 'published' | 'unpublished' | 'expired';
function recipientEffectiveStatus(r: BookletRecipientRow): EffectiveStatus {
  if (r.status !== 'published') return 'unpublished';
  if (r.expires_at && new Date(r.expires_at) <= new Date()) return 'expired';
  return 'published';
}
```
Drives the badge + row label so "Expired" shows **before** any reader request
triggers the DB flip — display never depends on the lazy write.

### Date control
`<input type="date">` with `min` = tomorrow (local). In `RecipientRow` it edits an
existing recipient (→ `useUpdateRecipientExpiryMutation`); in `AddRecipientDialog`
it's an optional field (setting it starts the link Published). Row shows
"Active until <date>" or "Expired <date>" when set.

### Badge
`RecipientStatusBadge` renders the effective status: Published = green,
Unpublished = muted, **Expired = amber/pink** (StatusBadge visual language).

## Verification

1. Add "Rivka" with an expiry ~1-2 min out (or set it on her row). Badge shows
   Published, row shows "Active until …".
2. Open her `/b/:token` before expiry → renders.
3. After the expiry passes: opening the link → generic not-found; her stored
   `status` is now `unpublished`; the row badge shows "Expired" (even before the
   reader hit, thanks to the helper).
4. Set a new future date on her row → badge back to Published, link renders again.
5. Clear the date on a published recipient → stays published, no expiry.
6. Date control rejects today/past (min = tomorrow).
7. Lint + typecheck green.

## Out of scope

- Bulk actions + search/pagination (RP5).
