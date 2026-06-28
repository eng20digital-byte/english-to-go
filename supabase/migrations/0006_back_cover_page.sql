-- 0006_back_cover_page.sql
-- Back cover support (B1 of docs/cover-back-milestones). A back cover is NOT a
-- separate table — it's a `pages` row flagged `is_back_cover`, pinned to
-- max(page_order), at most one per booklet, reusing page_elements / the editor /
-- the renderer. Its canvas size is derived from is_back_cover (portrait 960×1080,
-- same as the front cover), never stored. This migration only adds the flag, the
-- one-back-cover invariant, the add_back_cover_page RPC, and updates the quiz
-- invariant in every structural RPC to "only the last non-back-cover page may be
-- is_quiz_page" — no visible behaviour change for booklets without a back cover.

alter table pages add column is_back_cover boolean not null default false;

-- At most one back cover per booklet. The partial unique index is the real guard
-- (race-safe); add_back_cover_page's explicit existence check just gives a clearer
-- error. Existing GRANTs on `pages` already cover the new column.
create unique index pages_one_back_cover_per_booklet
  on pages (booklet_id) where is_back_cover;

-- Appends the booklet's single back cover at max(page_order) + 1 (no page shifts
-- needed — it always goes to the end). Re-enforces the updated quiz invariant after
-- the insert.
create function add_back_cover_page(p_booklet_id uuid)
returns pages as $$
declare
  new_page pages;
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  if exists (select 1 from pages where booklet_id = p_booklet_id and is_back_cover) then
    raise exception 'booklet already has a back cover page';
  end if;

  insert into pages (booklet_id, page_order, is_back_cover, is_quiz_page)
  values (
    p_booklet_id,
    (select coalesce(max(page_order) + 1, 0) from pages where booklet_id = p_booklet_id),
    true,
    false
  )
  returning * into new_page;

  -- Only the last non-back-cover page may be is_quiz_page. The back cover that
  -- was just inserted can never be quiz; this enforces the invariant on content pages.
  update pages set is_quiz_page = false
  where booklet_id = p_booklet_id
    and is_quiz_page = true
    and not is_back_cover
    and page_order <> (
      select max(page_order) from pages
      where booklet_id = p_booklet_id and not is_back_cover
    );

  return new_page;
end;
$$ language plpgsql security definer;

grant execute on function add_back_cover_page(uuid) to authenticated;

-- reorder_pages: now pins BOTH covers — front at order 0, back at order max
-- (sort priority 0 < 1 < 2), with content pages keeping their relative order
-- from p_page_ids. row_number() - 1 produces a contiguous 0..n-1 sequence.
create or replace function reorder_pages(p_booklet_id uuid, p_page_ids uuid[])
returns void as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  if (select array_agg(id order by id) from pages where booklet_id = p_booklet_id)
     is distinct from (select array_agg(id order by id) from unnest(p_page_ids) as id)
  then
    raise exception 'page id list does not match existing pages for this booklet';
  end if;

  set constraints pages_booklet_id_page_order_key deferred;

  update pages set page_order = ordered.new_order
  from (
    select p.id, row_number() over (
             order by (case when p.is_cover      then 0
                            when p.is_back_cover then 2
                            else                      1
                       end), t.ord
           ) - 1 as new_order
    from unnest(p_page_ids) with ordinality as t(id, ord)
    join pages p on p.id = t.id
  ) as ordered
  where pages.id = ordered.id;

  -- Updated quiz invariant: only the last non-back-cover page may be is_quiz_page.
  update pages set is_quiz_page = false
  where booklet_id = p_booklet_id
    and is_quiz_page = true
    and not is_back_cover
    and page_order <> (
      select max(page_order) from pages
      where booklet_id = p_booklet_id and not is_back_cover
    );
end;
$$ language plpgsql security definer;

-- add_page: updated quiz invariant, now enforced post-insert (matching the other
-- structural RPCs) so the subquery sees the final page_order after the new row
-- is in place. Without a back cover, behaviour is identical to the 0002 version:
-- the new (non-quiz) page is last, so the subquery returns its order and every
-- prior quiz page is cleared.
create or replace function add_page(p_booklet_id uuid)
returns pages as $$
declare
  new_page pages;
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  insert into pages (booklet_id, page_order, is_quiz_page)
  values (
    p_booklet_id,
    (select coalesce(max(page_order) + 1, 0) from pages where booklet_id = p_booklet_id),
    false
  )
  returning * into new_page;

  -- Updated quiz invariant: only the last non-back-cover page may be is_quiz_page.
  update pages set is_quiz_page = false
  where booklet_id = p_booklet_id
    and is_quiz_page = true
    and not is_back_cover
    and page_order <> (
      select max(page_order) from pages
      where booklet_id = p_booklet_id and not is_back_cover
    );

  return new_page;
end;
$$ language plpgsql security definer;

-- delete_page: updated quiz invariant only — structural logic unchanged.
create or replace function delete_page(p_page_id uuid)
returns void as $$
declare
  v_booklet_id uuid;
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  select booklet_id into v_booklet_id from pages where id = p_page_id;
  if v_booklet_id is null then
    raise exception 'page not found';
  end if;

  set constraints pages_booklet_id_page_order_key deferred;

  delete from pages where id = p_page_id;

  update pages set page_order = ordered.new_order
  from (
    select id, row_number() over (order by page_order) - 1 as new_order
    from pages where booklet_id = v_booklet_id
  ) as ordered
  where pages.id = ordered.id;

  -- Updated quiz invariant: only the last non-back-cover page may be is_quiz_page.
  update pages set is_quiz_page = false
  where booklet_id = v_booklet_id
    and is_quiz_page = true
    and not is_back_cover
    and page_order <> (
      select max(page_order) from pages
      where booklet_id = v_booklet_id and not is_back_cover
    );
end;
$$ language plpgsql security definer;

-- insert_page_with_elements: updated quiz invariant only — structural logic unchanged.
create or replace function insert_page_with_elements(
  p_booklet_id uuid,
  p_after_page_id uuid,
  p_is_quiz_page boolean,
  p_elements jsonb
)
returns pages as $$
declare
  v_after_order int;
  v_new_order int;
  new_page pages;
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  set constraints pages_booklet_id_page_order_key deferred;

  if p_after_page_id is null then
    v_new_order := (select coalesce(max(page_order) + 1, 0) from pages where booklet_id = p_booklet_id);
  else
    select page_order into v_after_order
    from pages
    where id = p_after_page_id and booklet_id = p_booklet_id;
    if v_after_order is null then
      raise exception 'after-page not found in this booklet';
    end if;
    v_new_order := v_after_order + 1;
    update pages set page_order = page_order + 1
    where booklet_id = p_booklet_id and page_order >= v_new_order;
  end if;

  insert into pages (booklet_id, page_order, is_quiz_page)
  values (p_booklet_id, v_new_order, coalesce(p_is_quiz_page, false))
  returning * into new_page;

  insert into page_elements (
    page_id, type, z_index, x, y, w, h, rotation, props
  )
  select
    new_page.id,
    (elem->>'type')::text,
    coalesce((elem->>'z_index')::int, 0),
    (elem->>'x')::numeric,
    (elem->>'y')::numeric,
    (elem->>'w')::numeric,
    (elem->>'h')::numeric,
    coalesce((elem->>'rotation')::numeric, 0),
    coalesce(elem->'props', '{}'::jsonb)
  from jsonb_array_elements(coalesce(p_elements, '[]'::jsonb)) as elem;

  -- Updated quiz invariant: only the last non-back-cover page may be is_quiz_page.
  update pages set is_quiz_page = false
  where booklet_id = p_booklet_id
    and is_quiz_page = true
    and not is_back_cover
    and page_order <> (
      select max(page_order) from pages
      where booklet_id = p_booklet_id and not is_back_cover
    );

  return new_page;
end;
$$ language plpgsql security definer;

-- duplicate_page delegates to insert_page_with_elements, which now runs the
-- updated invariant — no change to this function's own logic.
create or replace function duplicate_page(p_page_id uuid)
returns pages as $$
declare
  v_booklet_id uuid;
  v_is_quiz boolean;
  v_elements jsonb;
  new_page pages;
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  select booklet_id, is_quiz_page into v_booklet_id, v_is_quiz
  from pages where id = p_page_id;
  if v_booklet_id is null then
    raise exception 'page not found';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
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
    ),
    '[]'::jsonb
  )
  into v_elements
  from page_elements e
  where e.page_id = p_page_id;

  new_page := insert_page_with_elements(v_booklet_id, p_page_id, v_is_quiz, v_elements);
  return new_page;
end;
$$ language plpgsql security definer;
