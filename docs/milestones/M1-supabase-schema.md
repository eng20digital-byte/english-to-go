# M1 — Supabase Schema Migration

## Goal
The full database schema, RLS policies, RPC functions, and storage buckets exist and are verified in a real Supabase project, before any app code touches them.

## Scope
- Create the Supabase project (if not already created) and capture URL + anon key into local `.env` (not committed).
- `supabase/migrations/0001_init.sql` containing:
  - Tables: `admin_users`, `fonts`, `media_assets`, `booklets`, `pages`, `page_elements` — exact columns/types/FKs/indexes per CLAUDE.md §Schema. `booklets.status` is `text` constrained to `'draft' | 'published' | 'disabled'` via a `check` constraint.
  - `is_admin()` SQL function (security definer).
  - RLS enabled on every table with the public/admin split documented in CLAUDE.md.
  - RPC `save_page_elements(page_id uuid, elements jsonb)` — transactional delete+reinsert (or upsert) of a page's elements.
  - RPC `delete_media_asset(id uuid)` — security definer, admin-gated, raises if referenced by any `page_elements.props->>'media_asset_id'`.
- Storage buckets `fonts` and `media`, both public-read; write policies gated to `is_admin()`.
- Manually create the one Supabase Auth user (via Supabase Studio) and insert the matching `admin_users` row.

## Out of scope
No app code reads/writes this yet — verification is via Supabase Studio / SQL editor / REST calls only.

## Manual verification
1. Run the migration against the Supabase project (Studio SQL editor or `supabase db push` if CLI is set up).
2. In Studio, confirm all 6 tables exist with RLS "enabled" badge.
3. As the anon key (no session), confirm `select * from booklets` returns only rows with `status = 'published'` (will be empty initially — insert one `draft`, one `published`, and one `disabled` test row to confirm only `published` is visible, and that `disabled` is indistinguishable from `draft` from the anon key's point of view).
4. As the admin's authenticated session, confirm `select * from booklets` returns both.
5. Confirm uploading to the `media` bucket without auth fails, and with the admin session succeeds.
6. Confirm `delete_media_asset` raises when called on an asset referenced by a test `page_elements` row, and succeeds when unreferenced.
