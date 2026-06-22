-- 0002_page_management.sql
-- M7 — page CRUD/reorder RPCs. See CLAUDE.md "Supabase Schema" and
-- docs/milestones/M7-booklet-page-crud.md.

-- Reordering/deleting pages renumbers page_order for multiple rows of the
-- same booklet in one statement, which can transiently collide with the
-- unique(booklet_id, page_order) constraint (e.g. swapping orders 0 and 1).
-- Deferring the check to end-of-transaction is the standard Postgres fix —
-- the constraint is otherwise checked per-row, immediately, even within a
-- single multi-row UPDATE.
alter table pages drop constraint pages_booklet_id_page_order_key;
alter table pages add constraint pages_booklet_id_page_order_key
  unique (booklet_id, page_order) deferrable initially immediate;

-- Appends a new page at the end of the booklet. Clearing any existing
-- is_quiz_page here maintains the invariant that only the last page may be
-- the quiz page (CLAUDE.md: "is_quiz_page flags the final page") — without
-- this, adding a page after the quiz page would silently leave it non-last.
create function add_page(p_booklet_id uuid)
returns pages as $$
declare
  new_page pages;
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  update pages set is_quiz_page = false
  where booklet_id = p_booklet_id and is_quiz_page = true;

  insert into pages (booklet_id, page_order, is_quiz_page)
  values (
    p_booklet_id,
    (select coalesce(max(page_order) + 1, 0) from pages where booklet_id = p_booklet_id),
    false
  )
  returning * into new_page;

  return new_page;
end;
$$ language plpgsql security definer;

-- Deletes a page and renumbers the remaining pages of its booklet to a
-- contiguous 0..n-1 sequence (page_elements cascade-delete via the existing
-- FK). Also re-checks the is_quiz_page invariant, since deleting the
-- formerly-last page promotes a different page to last.
create function delete_page(p_page_id uuid)
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

  update pages set is_quiz_page = false
  where booklet_id = v_booklet_id
    and is_quiz_page = true
    and page_order <> (select max(page_order) from pages where booklet_id = v_booklet_id);
end;
$$ language plpgsql security definer;

-- Applies a full reordering: p_page_ids must be every page id belonging to
-- p_booklet_id, in the desired final order. page_order is set to each id's
-- position in the array. Re-checks the is_quiz_page invariant since the
-- previously-last page may no longer be last after reordering.
create function reorder_pages(p_booklet_id uuid, p_page_ids uuid[])
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
    select id, row_number() over () - 1 as new_order
    from unnest(p_page_ids) as id
  ) as ordered
  where pages.id = ordered.id;

  update pages set is_quiz_page = false
  where booklet_id = p_booklet_id
    and is_quiz_page = true
    and page_order <> (select max(page_order) from pages where booklet_id = p_booklet_id);
end;
$$ language plpgsql security definer;
