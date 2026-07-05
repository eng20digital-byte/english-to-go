# RP2 — Recipient Data Hooks

**Goal:** React Query hooks for managing a booklet's recipients, following the
mutation + invalidation convention already in `useBookletQuery.ts`.

**Risk:** low — additive data layer, no UI wired yet.

## Scope

- New `src/hooks/useBookletRecipientsQuery.ts`.
- `src/config/booklets.ts` (or new `src/config/recipients.ts`) — recipient status
  labels / any constants (no magic values in components).

## Change shape

Query-key convention: `['booklet-recipients', bookletId]`.

Hooks:

- **`useBookletRecipientsQuery(bookletId)`** — `enabled: !!bookletId`, selects the
  recipient columns, ordered by `created_at`.
- **`useAddRecipientMutation`** — insert
  `{ booklet_id, name, access_token: nanoid(PUBLIC_TOKEN_LENGTH), status, expires_at }`.
  (Reuses the `nanoid(PUBLIC_TOKEN_LENGTH)` idiom from `useCreateBookletMutation`.)
- **`useUpdateRecipientStatusMutation`** — update `status`; set `published_at =
  now()` when going live.
- **`useRotateRecipientTokenMutation`** — update `access_token` to a fresh nanoid
  (kills the old link, keeps name/status).
- **`useDeleteRecipientMutation`** — delete by id.
- (`useUpdateRecipientExpiryMutation` is added in **RP4**.)

Every mutation's `onSuccess` invalidates `['booklet-recipients', bookletId]` and
`['admin-booklets']` (so a card recipient count refreshes).

All writes go straight to the table (gated by the `is_admin()` RLS from RP0), same
pattern as the booklet status/title mutations — no RPC needed for admin writes.

## Verification

Temporarily exercise from a scratch component or the browser devtools/React Query
devtools (no permanent UI yet):

1. `useAddRecipientMutation` inserts a row; it appears in
   `useBookletRecipientsQuery`.
2. `useUpdateRecipientStatusMutation` flips status; the reader link (RP1) starts /
   stops resolving accordingly.
3. `useRotateRecipientTokenMutation` changes the token; the old `/b/:token` 404s,
   the new one works.
4. `useDeleteRecipientMutation` removes it.
5. Lint + typecheck green.

## Out of scope

- No page/components (RP3). No expiry mutation (RP4). No bulk ops (RP5).
