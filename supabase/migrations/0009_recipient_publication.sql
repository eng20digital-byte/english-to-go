-- 0009_recipient_publication.sql
-- Per-recipient booklet publication (RP0 — DB only).
--
-- Moves publication from a single global state to a per-recipient model: each
-- booklet can hand out many independent links, one per named recipient, each
-- published/unpublished on its own schedule (manual toggle or a timed expiry),
-- while the admin keeps their own separate master link (booklets.status +
-- public_token, UNCHANGED). See CLAUDE.md and docs/recipient-publication-milestones/.
--
-- Purely additive: no existing table, policy, RLS rule, or row is modified, so
-- the live reader keeps working via its current nested-select path until RP1.
-- Follows the 0001_init.sql ordering: table → enable RLS → GRANT → policies → RPC.

-- ============================================================================
-- Table
-- ============================================================================

create table booklet_recipients (
  id            uuid primary key default gen_random_uuid(),
  booklet_id    uuid not null references booklets(id) on delete cascade,
  name          text not null,                    -- admin-facing label ("Dana")
  access_token  text not null unique,             -- independent nanoid; the /b/:token link
  status        text not null default 'unpublished'
                  check (status in ('published', 'unpublished')),
  expires_at    timestamptz,                      -- optional; null = no expiry
  published_at  timestamptz,                      -- audit: last time it went live
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- List a booklet's recipients. access_token already has an implicit unique
-- index — the reader's hot lookup path inside get_booklet_by_token below.
create index booklet_recipients_booklet_id_idx on booklet_recipients (booklet_id);

-- ============================================================================
-- RLS + grants
-- ============================================================================

-- The reader never touches this table directly (it goes through the security
-- definer RPC), so there is deliberately NO anon grant — this also prevents
-- token enumeration by anonymous callers. Admin CRUD only, gated by is_admin(),
-- exactly like booklet status/title writes.
alter table booklet_recipients enable row level security;
grant select, insert, update, delete on booklet_recipients to authenticated;

create policy "booklet_recipients_select_admin" on booklet_recipients for select using (is_admin());
create policy "booklet_recipients_insert_admin" on booklet_recipients for insert with check (is_admin());
create policy "booklet_recipients_update_admin" on booklet_recipients for update using (is_admin());
create policy "booklet_recipients_delete_admin" on booklet_recipients for delete using (is_admin());

-- ============================================================================
-- Reader RPC — get_booklet_by_token
-- ============================================================================
--
-- Why an RPC and not RLS: RLS has no token parameter, so a per-recipient RLS
-- policy could only say "a published grant EXISTS for this booklet" — which
-- would leak the booklet to an *unpublished* recipient's token too. Correct
-- isolation requires resolving the specific token, so the reader resolves
-- through this security definer function (bypasses RLS, gates internally),
-- matching the save_page_elements RPC shape in 0001.
--
-- Resolution order:
--   1. Published recipient grant by access_token (independent of booklet.status).
--      - If its expires_at has passed → lazily persist status='unpublished' and
--        return null (no cron; expiry is evaluated exactly when the link is hit,
--        and the persisted flip is what makes the admin UI's DB state agree).
--   2. Else fall back to the master link: a booklets row with matching
--      public_token and status='published' (master links have no expiry).
--   3. Still nothing → null. Unknown / unpublished / revoked / expired all
--      return the same null, so the reader's one generic not-found leaks no
--      status information (preserves the M5 no-leak property).
--
-- The projection selects EXACTLY the columns the reader consumes today
-- (useBookletQuery.ts) via explicit jsonb_build_object — deliberately NOT
-- to_jsonb(b), which would expose public_token / status / created_by to anon.
create function get_booklet_by_token(p_token text)
returns jsonb as $$
declare
  v_booklet_id uuid;
  v_grant      booklet_recipients;
begin
  -- 1. Per-recipient link: a published grant wins, independent of booklet.status.
  select * into v_grant
  from booklet_recipients
  where access_token = p_token and status = 'published';

  if found then
    -- Lazy expiry: if the link's date has passed, flip it to unpublished
    -- (persisted, so the admin sees it) and deny this request.
    if v_grant.expires_at is not null and v_grant.expires_at <= now() then
      update booklet_recipients
      set status = 'unpublished', updated_at = now()
      where id = v_grant.id;
      return null;
    end if;
    v_booklet_id := v_grant.booklet_id;
  end if;

  -- 2. Fall back to the admin master link (existing global publish).
  if v_booklet_id is null then
    select id into v_booklet_id
    from booklets
    where public_token = p_token and status = 'published';
  end if;

  -- 3. Nothing resolved → null (no status leak).
  if v_booklet_id is null then
    return null;
  end if;

  -- Build the exact nested booklet → pages → page_elements shape the reader
  -- already consumes, pages ordered by page_order, elements by z_index.
  return (
    select jsonb_build_object(
      'id', b.id,
      'title', b.title,
      'canvas_width', b.canvas_width,
      'canvas_height', b.canvas_height,
      'background_color', b.background_color,
      'quiz_embed_code', b.quiz_embed_code,
      'quiz_embed_height', b.quiz_embed_height,
      'show_quiz_on_last_spread', b.show_quiz_on_last_spread,
      'pages', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'page_order', p.page_order,
            'is_quiz_page', p.is_quiz_page,
            'is_cover', p.is_cover,
            'is_back_cover', p.is_back_cover,
            'page_elements', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'id', e.id,
                  'page_id', e.page_id,
                  'type', e.type,
                  'z_index', e.z_index,
                  'x', e.x,
                  'y', e.y,
                  'w', e.w,
                  'h', e.h,
                  'rotation', e.rotation,
                  'props', e.props
                )
                order by e.z_index
              )
              from page_elements e
              where e.page_id = p.id
            ), '[]'::jsonb)
          )
          order by p.page_order
        )
        from pages p
        where p.booklet_id = b.id
      ), '[]'::jsonb)
    )
    from booklets b
    where b.id = v_booklet_id
  );
end;
$$ language plpgsql security definer;

-- Reader is anonymous — grant EXECUTE to both roles. The function gates access
-- internally; the reader has no direct table grant on booklet_recipients.
grant execute on function get_booklet_by_token(text) to anon, authenticated;
