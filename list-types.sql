-- eB Lists: list display mode
-- Run once in Supabase SQL Editor.
-- Existing lists remain unordered by default.

alter table public.lists
  add column if not exists ordered boolean not null default false;

comment on column public.lists.ordered is
  'Whether the list is displayed as an ordered list (numbered) rather than unordered (bulleted).';
