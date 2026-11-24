-- Add student identity fields to LMS profiles.
alter table public.profiles
  add column if not exists nisn text,
  add column if not exists class_id uuid references public.classes(id) on delete set null;

create unique index if not exists profiles_nisn_unique
  on public.profiles (nisn)
  where nisn is not null and btrim(nisn) <> '';
