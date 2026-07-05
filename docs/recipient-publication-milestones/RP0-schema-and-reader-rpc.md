# RP0 — Schema + Reader RPC (DB only)

**Goal:** Add the `booklet_recipients` table and the `get_booklet_by_token` RPC.
No app code changes — purely additive DB migration, so the existing reader keeps
working untouched.

**Risk:** medium (a schema migration, but additive-only — no existing table,
policy, or row is modified).

## Scope

- New migration `supabase/migrations/0009_recipient_publication.sql`.
- Nothing else. `booklets.status` / `public_token` / all existing RLS stay as-is.

## Change shape

Follows the `0001_init.sql` ordering: table → enable RLS → GRANT → policies → RPC.

### Table

```sql
create table booklet_recipients (
  id            uuid primary key default gen_random_uuid(),
  booklet_id    uuid not null references booklets(id) on delete cascade,
  name          text not null,
  access_token  text not null unique,          -- independent nanoid; the /b/:token link
  status        text not null default 'unpublished'
                  check (status in ('published', 'unpublished')),
  expires_at    timestamptz,                   -- optional; null = no expiry
  published_at  timestamptz,                   -- audit
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index booklet_recipients_booklet_id_idx on booklet_recipients (booklet_id);
```

- `on delete cascade` matches `pages` / `page_elements`.
- `access_token unique` gives the implicit index the reader lookup rides on.

### RLS + grants

Reader never touches this table directly (it goes through the RPC), so **no anon
grant** — this also blocks token enumeration.

```sql
alter table booklet_recipients enable row level security;
grant select, insert, update, delete on booklet_recipients to authenticated;
create policy "booklet_recipients_select_admin" on booklet_recipients for select using (is_admin());
create policy "booklet_recipients_insert_admin" on booklet_recipients for insert with check (is_admin());
create policy "booklet_recipients_update_admin" on booklet_recipients for update using (is_admin());
create policy "booklet_recipients_delete_admin" on booklet_recipients for delete using (is_admin());
```

### Reader RPC — `get_booklet_by_token(p_token text) returns jsonb`

`security definer` (bypasses RLS, gates internally), granted EXECUTE to
`anon, authenticated`. Logic:

1. Look up a **published** recipient grant by `access_token`.
2. If found and `expires_at <= now()` → **persist `status = 'unpublished'`** and
   return `null` (lazy expiry).
3. Else if found → use its `booklet_id`.
4. Else fall back to the **master** link: a `booklets` row with matching
   `public_token` and `status = 'published'`.
5. If still nothing → `null` (unknown / unpublished / revoked all look identical —
   no status leak).
6. Otherwise build and return the nested `booklet → pages → page_elements` JSON,
   ordered by `page_order` and `z_index`, projecting exactly the columns the
   reader consumes today (see `useBookletQuery.ts:27-44`).

Full SQL is in the approved plan (§2). The projection must include the reader's
columns: booklet `id, title, canvas_width, canvas_height, background_color,
quiz_embed_code, quiz_embed_height, show_quiz_on_last_spread`; page `id,
page_order, is_quiz_page, is_cover, is_back_cover`; element `id, page_id, type,
z_index, x, y, w, h, rotation, props`.

## Verification

Run in the Supabase SQL editor / against the DB:

1. Migration applies clean; `booklet_recipients` exists with the columns above.
2. `select has_function_privilege('anon', 'get_booklet_by_token(text)', 'execute');`
   → `true`.
3. `select get_booklet_by_token('<an existing published booklet public_token>');`
   → returns the booklet JSON with nested pages/elements.
4. `select get_booklet_by_token('nonexistent');` → `null`.
5. Insert a test recipient row (status `published`, no expiry) for a booklet, then
   `get_booklet_by_token('<that access_token>')` → returns the same booklet JSON.
6. Set that row's `expires_at` to a past instant, call the RPC again → returns
   `null` **and** the row's `status` is now `unpublished`.
7. Clean up the test row.

## Out of scope

- No frontend changes. The live reader still uses its current nested-select path
  until RP1 — both work simultaneously during this milestone.
