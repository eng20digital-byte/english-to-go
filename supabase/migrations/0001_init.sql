-- 0001_init.sql
-- Digital Booklet Platform — initial schema, RLS, RPCs, storage buckets.
-- See CLAUDE.md "Supabase Schema" section for the canonical reference this implements.

-- ============================================================================
-- Tables
-- ============================================================================

create table admin_users (
  id uuid primary key references auth.users(id),
  email text not null,
  created_at timestamptz not null default now()
);

create table fonts (
  id uuid primary key default gen_random_uuid(),
  name text not null, 
  weight text not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  unique (name, weight)
);

create table media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  file_name text not null,
  width int,
  height int,
  created_by uuid references admin_users(id),
  created_at timestamptz not null default now()
);
create index media_assets_storage_path_idx on media_assets (storage_path);

create table booklets (
  id uuid primary key default gen_random_uuid(),
  public_token text not null unique,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'disabled')),
  canvas_width int not null default 1080,
  canvas_height int not null default 1920,
  quiz_embed_code text,
  quiz_embed_height int default 600,
  created_by uuid references admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table pages (
  id uuid primary key default gen_random_uuid(),
  booklet_id uuid not null references booklets(id) on delete cascade,
  page_order int not null,
  is_quiz_page boolean not null default false,
  created_at timestamptz not null default now(),
  unique (booklet_id, page_order)
);
create index pages_booklet_id_idx on pages (booklet_id);

create table page_elements (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  type text not null,
  z_index int not null default 0,
  x numeric not null,
  y numeric not null,
  w numeric not null,
  h numeric not null,
  rotation numeric not null default 0,
  props jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index page_elements_page_id_idx on page_elements (page_id);
create index page_elements_page_id_z_index_idx on page_elements (page_id, z_index);

-- ============================================================================
-- is_admin() — reusable admin check, never a hardcoded UID in RLS policies.
-- ============================================================================

create function is_admin() returns boolean as $$
  select exists (select 1 from admin_users where id = auth.uid())
$$ language sql security definer stable;

-- ============================================================================
-- RLS
-- ============================================================================

alter table admin_users enable row level security;
alter table fonts enable row level security;
alter table media_assets enable row level security;
alter table booklets enable row level security;
alter table pages enable row level security;
alter table page_elements enable row level security;

-- RLS policies below only filter rows — Postgres still requires an explicit
-- GRANT before anon/authenticated can touch a table at all. Supabase's Table
-- Editor does this automatically for tables created through it; raw SQL
-- migrations must do it explicitly.
grant usage on schema public to anon, authenticated;

grant select on admin_users to anon, authenticated;
grant insert, update, delete on admin_users to authenticated;

grant select on fonts to anon, authenticated;
grant insert, update, delete on fonts to authenticated;

grant select on media_assets to anon, authenticated;
grant insert, update on media_assets to authenticated;

grant select on booklets to anon, authenticated;
grant insert, update, delete on booklets to authenticated;

grant select on pages to anon, authenticated;
grant insert, update, delete on pages to authenticated;

grant select on page_elements to anon, authenticated;
grant insert, update, delete on page_elements to authenticated;

-- admin_users: admins only. The very first row is inserted manually via the
-- Studio SQL editor (running as the postgres role, which bypasses RLS) since
-- no admin exists yet to satisfy is_admin() at that point.
create policy "admin_users_select" on admin_users for select using (is_admin());
create policy "admin_users_insert" on admin_users for insert with check (is_admin());
create policy "admin_users_update" on admin_users for update using (is_admin());
create policy "admin_users_delete" on admin_users for delete using (is_admin());

-- fonts: public read, admin write.
create policy "fonts_select_public" on fonts for select using (true);
create policy "fonts_insert_admin" on fonts for insert with check (is_admin());
create policy "fonts_update_admin" on fonts for update using (is_admin());
create policy "fonts_delete_admin" on fonts for delete using (is_admin());

-- media_assets: public read, admin insert/update. No delete policy — deletion
-- only via delete_media_asset() RPC below.
create policy "media_assets_select_public" on media_assets for select using (true);
create policy "media_assets_insert_admin" on media_assets for insert with check (is_admin());
create policy "media_assets_update_admin" on media_assets for update using (is_admin());

-- booklets: public can see only published rows; admins see everything.
create policy "booklets_select" on booklets for select
  using (status = 'published' or is_admin());
create policy "booklets_insert_admin" on booklets for insert with check (is_admin());
create policy "booklets_update_admin" on booklets for update using (is_admin());
create policy "booklets_delete_admin" on booklets for delete using (is_admin());

-- pages: public can see pages of published booklets; admins see everything.
create policy "pages_select" on pages for select
  using (
    is_admin()
    or exists (
      select 1 from booklets
      where booklets.id = pages.booklet_id and booklets.status = 'published'
    )
  );
create policy "pages_insert_admin" on pages for insert with check (is_admin());
create policy "pages_update_admin" on pages for update using (is_admin());
create policy "pages_delete_admin" on pages for delete using (is_admin());

-- page_elements: public can see elements of pages of published booklets;
-- admins see everything. Writes happen through save_page_elements() in
-- practice but direct admin writes are also allowed for flexibility.
create policy "page_elements_select" on page_elements for select
  using (
    is_admin()
    or exists (
      select 1 from pages
      join booklets on booklets.id = pages.booklet_id
      where pages.id = page_elements.page_id and booklets.status = 'published'
    )
  );
create policy "page_elements_insert_admin" on page_elements for insert with check (is_admin());
create policy "page_elements_update_admin" on page_elements for update using (is_admin());
create policy "page_elements_delete_admin" on page_elements for delete using (is_admin());

-- ============================================================================
-- RPCs
-- ============================================================================

-- Transactional replace of a page's elements. security definer so it can run
-- under the admin-gated check below rather than relying on row-by-row RLS.
create function save_page_elements(page_id uuid, elements jsonb)
returns void as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  delete from page_elements where page_elements.page_id = save_page_elements.page_id;

  insert into page_elements (
    page_id, type, z_index, x, y, w, h, rotation, props
  )
  select
    save_page_elements.page_id,
    (elem->>'type')::text,
    coalesce((elem->>'z_index')::int, 0),
    (elem->>'x')::numeric,
    (elem->>'y')::numeric,
    (elem->>'w')::numeric,
    (elem->>'h')::numeric,
    coalesce((elem->>'rotation')::numeric, 0),
    coalesce(elem->'props', '{}'::jsonb)
  from jsonb_array_elements(elements) as elem;
end;
$$ language plpgsql security definer;

-- Deletes a media asset, but only if no page_elements reference it.
create function delete_media_asset(id uuid)
returns void as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  if exists (
    select 1 from page_elements
    where page_elements.props->>'media_asset_id' = delete_media_asset.id::text
  ) then
    raise exception 'media asset is still referenced by page_elements';
  end if;

  delete from media_assets where media_assets.id = delete_media_asset.id;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- Storage buckets
-- ============================================================================

insert into storage.buckets (id, name, public) values ('fonts', 'fonts', true);
insert into storage.buckets (id, name, public) values ('media', 'media', true);

create policy "fonts_bucket_select_public" on storage.objects for select
  using (bucket_id = 'fonts');
create policy "fonts_bucket_insert_admin" on storage.objects for insert
  with check (bucket_id = 'fonts' and is_admin());
create policy "fonts_bucket_update_admin" on storage.objects for update
  using (bucket_id = 'fonts' and is_admin());
create policy "fonts_bucket_delete_admin" on storage.objects for delete
  using (bucket_id = 'fonts' and is_admin());

create policy "media_bucket_select_public" on storage.objects for select
  using (bucket_id = 'media');
create policy "media_bucket_insert_admin" on storage.objects for insert
  with check (bucket_id = 'media' and is_admin());
create policy "media_bucket_update_admin" on storage.objects for update
  using (bucket_id = 'media' and is_admin());
create policy "media_bucket_delete_admin" on storage.objects for delete
  using (bucket_id = 'media' and is_admin());
