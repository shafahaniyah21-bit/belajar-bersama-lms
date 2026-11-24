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

create or replace function public.current_subject_id()
returns uuid language sql stable security definer
set search_path = public
as $
  select subject_id from public.profiles where id = auth.uid()
$;
revoke all on function public.current_subject_id() from public;
grant execute on function public.current_subject_id() to authenticated;

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
with check (id = auth.uid() and role <> 'admin' and subject_id is not distinct from public.current_subject_id());

-- Teachers can read learning content and grades only within their assigned subject.
drop policy if exists "courses read" on public.courses;
create policy "courses read" on public.courses for select to authenticated
using (
  public.is_admin()
  or (public.is_teacher() and subject_id = public.current_subject_id())
  or (not public.is_teacher() and (
    class_id is null
    or exists (select 1 from public.class_members m where m.class_id = courses.class_id and m.student_id = auth.uid())
    or exists (select 1 from public.classes c where c.id = courses.class_id and c.teacher_id = auth.uid())
  ))
);

drop policy if exists "assignments read" on public.assignments;
create policy "assignments read" on public.assignments for select to authenticated
using (
  public.is_admin()
  or (public.is_teacher() and subject_id = public.current_subject_id())
  or (not public.is_teacher() and (
    class_id is null
    or exists (select 1 from public.class_members m where m.class_id = assignments.class_id and m.student_id = auth.uid())
    or exists (select 1 from public.classes c where c.id = assignments.class_id and c.teacher_id = auth.uid())
  ))
);

drop policy if exists "grades read" on public.grades;
create policy "grades read" on public.grades for select to authenticated
using (
  student_id = auth.uid()
  or public.is_admin()
  or graded_by = auth.uid()
  or (public.is_teacher() and exists (
    select 1 from public.assignments a
    where a.id = grades.assignment_id and a.subject_id = public.current_subject_id()
  ))
);

drop policy if exists "staff manages grades" on public.grades;
create policy "staff manages grades" on public.grades for all to authenticated
using (
  public.is_admin()
  or (public.is_teacher() and exists (
    select 1 from public.assignments a
    where a.id = grades.assignment_id and a.subject_id = public.current_subject_id()
  ))
)
with check (
  public.is_admin()
  or (public.is_teacher() and exists (
    select 1 from public.assignments a
    where a.id = grades.assignment_id and a.subject_id = public.current_subject_id()
  ))
);

drop policy if exists "forum posts read" on public.forum_posts;
create policy "forum posts read" on public.forum_posts for select to authenticated
using (
  public.is_admin()
  or (public.is_teacher() and subject_id = public.current_subject_id())
  or not public.is_teacher()
);

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
