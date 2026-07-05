# RP6 — Docs + CLAUDE.md

**Goal:** Bring the permanent reference (`CLAUDE.md`) in line with the new model
and close out the milestone set.

**Risk:** trivial — documentation only.

## Scope

- `CLAUDE.md` — schema + architecture updates.
- This milestone folder — mark complete.

## Change shape (`CLAUDE.md`)

1. **Schema section** — add the `booklet_recipients` table (columns, RLS: admin
   only, no anon grant, `on delete cascade`, `access_token unique`, index on
   `booklet_id`). Add `get_booklet_by_token` to the RPC/notes.
2. **Public link / Routing sections** — document the two link types:
   - Master (admin) link = `booklets.public_token`, gated by `booklets.status`.
   - Recipient link = `booklet_recipients.access_token`, gated by per-grant
     `status` + optional `expires_at`.
   Both resolve at `/b/:token` via `get_booklet_by_token`.
3. **Amend the visibility-gate invariant.** Today CLAUDE.md says `booklets.status`
   is "the only visibility gate." Replace with: the master link is gated by
   `booklets.status`; recipient links are gated per-grant and resolved by the
   reader RPC. Note the lazy-expiry behavior (auto-unpublish on read after
   `expires_at`, no cron).
4. **Folder structure** — add `useBookletRecipientsQuery.ts`,
   `BookletUsersPage.tsx`, `RecipientRow.tsx`, `AddRecipientDialog.tsx`,
   `RecipientStatusBadge.tsx`, and migration `0009_recipient_publication.sql`.
5. **Reader RPC decision note** — record *why* the reader moved off the RLS
   nested-select (RLS can't scope to a single token → would leak the booklet to an
   unpublished recipient's link), so it's not re-litigated later.

## Verification

1. CLAUDE.md schema + structure match the shipped code (no stale references).
2. Re-read the "visibility gate" wording — it no longer claims a single global
   gate.
3. Merge `recipient-publication` → `main` once the full flow is verified and
   approved; delete the branch.

## Out of scope

- No code changes.
