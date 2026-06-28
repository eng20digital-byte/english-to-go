-- 0004_cover_page.sql
-- Front cover support (C1 of docs/cover-front-milestones). A cover is NOT a
-- separate table — it's a `pages` row flagged `is_cover`, pinned to
-- page_order = 0, at most one per booklet, reusing page_elements / the editor /
-- the renderer. Its canvas size is derived from is_cover (portrait 960×1080),
-- never stored. This migration only adds the flag, the one-cover invariant, the
-- add_cover_page RPC, and pins the cover first in reorder_pages — no visible
-- behaviour change for booklets without a cover.

alter table pages add column is_cover boolean not null default false;

-- At most one cover per booklet. The partial unique index is the real guard
-- (race-safe); add_cover_page's explicit existence check just gives a clearer
-- error. Existing GRANTs on `pages` already cover the new column.
create unique index pages_one_cover_per_booklet
  on pages (booklet_id) where is_cover;

-- Adds the booklet's single cover at page_order = 0, pushing every existing
-- page down one. Mirrors the 0002/0003 pattern: defer the
-- unique(booklet_id, page_order) check so the multi-row renumber (0→1, 1→2, …)
-- can't transiently collide. Pushing pages down never changes which page is
-- last, but the quiz-last invariant is re-enforced anyway for consistency with
-- the other structural RPCs.
create function add_cover_page(p_booklet_id uuid)
returns pages as $$
declare
  new_page pages;
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  if exists (select 1 from pages where booklet_id = p_booklet_id and is_cover) then
    raise exception 'booklet already has a cover page';
  end if;

  set constraints pages_booklet_id_page_order_key deferred;

  update pages set page_order = page_order + 1
  where booklet_id = p_booklet_id;

  insert into pages (booklet_id, page_order, is_cover, is_quiz_page)
  values (p_booklet_id, 0, true, false)
  returning * into new_page;

  update pages set is_quiz_page = false
  where booklet_id = p_booklet_id
    and is_quiz_page = true
    and page_order <> (select max(page_order) from pages where booklet_id = p_booklet_id);

  return new_page;
end;
$$ language plpgsql security definer;

-- reorder_pages (originally 0002) now pins the cover at page_order = 0
-- regardless of where it sits in the incoming array: the cover sorts first,
-- every other page keeps its relative order from p_page_ids, and row_number()
-- produces a contiguous 0..n-1 sequence. add_page (append),
-- delete_page (row_number over existing order), and
-- insert_page_with_elements/duplicate_page (insert after an existing page,
-- order >= 0) all already leave the cover first, so they're left unchanged.
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
             order by (case when p.is_cover then 0 else 1 end), t.ord
           ) - 1 as new_order
    from unnest(p_page_ids) with ordinality as t(id, ord)
    join pages p on p.id = t.id
  ) as ordered
  where pages.id = ordered.id;

  update pages set is_quiz_page = false
  where booklet_id = p_booklet_id
    and is_quiz_page = true
    and page_order <> (select max(page_order) from pages where booklet_id = p_booklet_id);
end;
$$ language plpgsql security definer;
