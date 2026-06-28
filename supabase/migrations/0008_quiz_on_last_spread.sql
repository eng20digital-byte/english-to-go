-- Move "show quiz" from a per-page flag to a booklet-level setting so it
-- is unaffected by adding or removing the back cover.
--
-- is_quiz_page on pages remains in the schema (removing a column is a
-- non-trivial migration); we simply stop reading it in the reader.

alter table booklets
  add column show_quiz_on_last_spread boolean not null default false;
