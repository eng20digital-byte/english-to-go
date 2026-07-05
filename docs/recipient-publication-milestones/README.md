# Recipient Publication — Per-User Booklet Links

A feature refactor: move booklet publication from a **single global** state to a
**per-recipient** model. Each booklet can hand out many independent links, one per
named recipient, each published/unpublished on its own schedule (manual toggle or
a timed expiry date), while the admin keeps their own separate master link.

Full design rationale: the approved plan at
`~/.claude/plans/i-have-a-digital-melodic-garden.md`.

## The core idea

> Booklet A → Dana = Published · Yossi = Unpublished · Rivka = Published (until 2026-08-01)

Three independent links off one booklet. The admin still has their own master link
governed by the existing `booklets.status` global publish — kept unchanged, now
just re-labeled as the "master (admin) link."

## Confirmed decisions (locked)

1. **Recipient = anonymous named grant** — name + own token + own status +
   optional expiry date. No reader login; the link is the only privacy boundary.
2. **Per-booklet, flat table** (`booklet_recipients`) — no shared cross-booklet
   contact identity.
3. **`booklets.status` + `public_token` kept unchanged** as the admin's master
   link. Recipient tokens are independent nanoids — unguessable from the master
   token or from each other.
4. **Dedicated admin sub-page** `/admin/booklets/:bookletId/users`.
5. **Reader resolves via a `security definer` RPC** (`get_booklet_by_token`), not
   the RLS nested-select — the only correct way to isolate a single token (RLS
   has no token parameter, so a per-recipient RLS policy would leak the booklet to
   an *unpublished* recipient's token).

## The two link types

| Link | Token | Gate | Expiry |
|------|-------|------|--------|
| **Master (admin)** | `booklets.public_token` | `booklets.status = 'published'` | none |
| **Recipient** | `booklet_recipients.access_token` | `status = 'published'` **and** not expired | optional `expires_at` |

Both resolve at `/b/:token` through the same reader RPC; the RPC checks the
recipient table first, then falls back to the master link.

## Expiry semantics

- `expires_at` is optional and **future-only** (UI `min` = tomorrow; mutation
  guards it).
- Checked **lazily, per reader request**: when a published recipient link is hit
  after its `expires_at`, the RPC **persists `status = 'unpublished'`** and returns
  not-found. No cron job — evaluated exactly when someone opens the link.
- The admin UI shows "Expired" **immediately** via a pure `recipientEffectiveStatus`
  helper, so display never waits on the lazy DB write.
- Setting a new future date **re-publishes** the link.

## Milestones

| # | File | Goal | Risk |
|---|------|------|------|
| RP0 | [RP0-schema-and-reader-rpc.md](RP0-schema-and-reader-rpc.md) | `booklet_recipients` table + RLS/grants + `get_booklet_by_token` RPC (DB only) | medium (migration) |
| RP1 | [RP1-reader-switch-to-rpc.md](RP1-reader-switch-to-rpc.md) | Reader fetches via the RPC; types added | medium |
| RP2 | [RP2-recipient-data-hooks.md](RP2-recipient-data-hooks.md) | React Query hooks: list + add/status/rotate/delete | low |
| RP3 | [RP3-manage-users-page.md](RP3-manage-users-page.md) | `/admin/booklets/:id/users` page + card entry point | medium |
| RP4 | [RP4-expiry-dates.md](RP4-expiry-dates.md) | Expiry mutation + date control + effective-status badge | low |
| RP5 | [RP5-card-entry-and-bulk.md](RP5-card-entry-and-bulk.md) | Bulk actions + server-side search/pagination | low |
| RP6 | [RP6-docs-and-claude-md.md](RP6-docs-and-claude-md.md) | Update CLAUDE.md + close out | trivial |

## Working process (per project convention)

One milestone at a time → small focused commits → stop and report what changed +
manual verification steps → wait for explicit go-ahead before the next. The reader
keeps working after **every** milestone (RP0 adds only new objects; RP1's RPC path
still resolves existing master links). Branch: `recipient-publication`.

## Files touched (map)

```
supabase/migrations/
  0009_recipient_publication.sql        -- NEW (RP0)
src/
  types/database.ts                     -- BookletRecipientRow, RecipientStatus (RP1)
  config/booklets.ts (or config/recipients.ts) -- recipient labels/consts (RP2/RP4)
  hooks/
    useBookletQuery.ts                  -- reader -> RPC; card count (RP1/RP3)
    useBookletRecipientsQuery.ts        -- NEW (RP2/RP4)
  admin/
    routes.tsx                          -- new /users route (RP3)
    booklets/
      BookletCard.tsx                   -- "Manage users (N)" + master-link relabel (RP3)
      BookletUsersPage.tsx              -- NEW (RP3)
      RecipientRow.tsx                  -- NEW (RP3/RP4)
      AddRecipientDialog.tsx            -- NEW (RP3/RP4)
      RecipientStatusBadge.tsx          -- NEW (RP3/RP4)
CLAUDE.md                               -- schema + decision entry (RP6)
```
