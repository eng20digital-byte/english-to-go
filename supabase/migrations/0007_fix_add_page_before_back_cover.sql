-- 0007_fix_add_page_before_back_cover.sql
-- add_page and insert_page_with_elements (p_after_page_id = null) previously
-- inserted at max(page_order)+1 across ALL pages, which placed new content
-- pages AFTER the back cover when one existed. Fixed: both functions now
-- insert just before the back cover (shifting it up by 1), so the back cover
-- is always the last page in the booklet.

create or replace function add_page(p_booklet_id uuid)
returns pages as $$
declare
  new_page pages;
  v_back_cover_order int;
  v_new_order int;
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  set constraints pages_booklet_id_page_order_key deferred;

  -- If a back cover exists, displace it by 1 and insert at its old slot.
  -- Otherwise append at the end as before.
  select page_order into v_back_cover_order
  from pages where booklet_id = p_booklet_id and is_back_cover;

  if v_back_cover_order is not null then
    v_new_order := v_back_cover_order;
    update pages set page_order = page_order + 1
    where booklet_id = p_booklet_id and is_back_cover;
  else
    v_new_order := coalesce(
      (select max(page_order) + 1 from pages where booklet_id = p_booklet_id),
      0
    );
  end if;

  insert into pages (booklet_id, page_order, is_quiz_page)
  values (p_booklet_id, v_new_order, false)
  returning * into new_page;

  -- Only the last non-back-cover page may be is_quiz_page.
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

-- insert_page_with_elements: when p_after_page_id is null (paste at "end"),
-- also insert before the back cover rather than after it.
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
  v_back_cover_order int;
  new_page pages;
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  set constraints pages_booklet_id_page_order_key deferred;

  if p_after_page_id is null then
    -- No anchor: insert before the back cover if one exists, otherwise append.
    select page_order into v_back_cover_order
    from pages where booklet_id = p_booklet_id and is_back_cover;

    if v_back_cover_order is not null then
      v_new_order := v_back_cover_order;
      update pages set page_order = page_order + 1
      where booklet_id = p_booklet_id and is_back_cover;
    else
      v_new_order := coalesce(
        (select max(page_order) + 1 from pages where booklet_id = p_booklet_id),
        0
      );
    end if;
  else
    select page_order into v_after_order
    from pages
    where id = p_after_page_id and booklet_id = p_booklet_id;
    if v_after_order is null then
      raise exception 'after-page not found in this booklet';
    end if;
    v_new_order := v_after_order + 1;
    -- Shift everything at >= v_new_order (including the back cover if it's there).
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

  -- Only the last non-back-cover page may be is_quiz_page.
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
