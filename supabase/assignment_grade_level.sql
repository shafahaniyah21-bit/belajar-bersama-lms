-- Store the selected grade level on each assignment.
alter table public.assignments
  add column if not exists class_name text;
