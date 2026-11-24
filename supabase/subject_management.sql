-- Subject management: one subject per teacher. Safe migration; existing learning records remain intact.
begin;

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists subject_id uuid references public.subjects(id) on delete set null;

alter table public.courses
  add column if not exists subject_id uuid references public.subjects(id) on delete set null;
alter table public.assignments
  add column if not exists subject_id uuid references public.subjects(id) on delete set null;
alter table public.forum_posts
  add column if not exists subject_id uuid references public.subjects(id) on delete set null;

alter table public.subjects enable row level security;

drop policy if exists "subjects read authenticated" on public.subjects;
create policy "subjects read authenticated"
on public.subjects for select to authenticated
using (auth.uid() is not null);

drop policy if exists "admin manages subjects" on public.subjects;
create policy "admin manages subjects"
on public.subjects for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Admin controls teacher assignment; teachers cannot change their own subject.
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated
using (id = auth.uid() and role <> 'admin')
with check (id = auth.uid() and role <> 'admin' and subject_id is not distinct from (select p.subject_id from public.profiles p where p.id = auth.uid()));

-- Content created by teachers must carry their assigned subject.
drop policy if exists "staff manages courses" on public.courses;
create policy "staff manages courses" on public.courses for all to authenticated
using (public.is_admin() or (public.is_teacher() and created_by = auth.uid() and subject_id = (select p.subject_id from public.profiles p where p.id = auth.uid())))
with check (public.is_admin() or (public.is_teacher() and created_by = auth.uid() and subject_id = (select p.subject_id from public.profiles p where p.id = auth.uid())));

drop policy if exists "staff manages assignments" on public.assignments;
create policy "staff manages assignments" on public.assignments for all to authenticated
using (public.is_admin() or (public.is_teacher() and created_by = auth.uid() and subject_id = (select p.subject_id from public.profiles p where p.id = auth.uid())))
with check (public.is_admin() or (public.is_teacher() and created_by = auth.uid() and subject_id = (select p.subject_id from public.profiles p where p.id = auth.uid())));

drop policy if exists "users create forum posts" on public.forum_posts;
create policy "users create forum posts" on public.forum_posts for insert to authenticated
with check (
  author_id = auth.uid()
  and (
    not public.is_teacher()
    or subject_id = (select p.subject_id from public.profiles p where p.id = auth.uid())
  )
);

drop policy if exists "authors or admin manage forum posts" on public.forum_posts;
create policy "authors or admin manage forum posts" on public.forum_posts for update to authenticated
using (author_id = auth.uid() or public.is_admin())
with check (
  author_id = auth.uid() or public.is_admin()
);

grant select, insert, update, delete on public.subjects to authenticated;

commit;
