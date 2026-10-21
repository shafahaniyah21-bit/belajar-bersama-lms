-- Belajar Bersama LMS: jalankan seluruh SQL ini di Supabase SQL Editor.
-- Penting: akun pertama harus dibuat lewat Sign Up, lalu tetapkan Admin secara manual.
-- Jangan pernah memasukkan service_role key ke aplikasi frontend.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'murid' check (role in ('admin','guru','murid')),
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  teacher_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  class_id uuid references public.classes(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  class_id uuid references public.classes(id) on delete cascade,
  due_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  answer_text text,
  file_url text,
  submitted_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  class_id uuid references public.classes(id) on delete cascade,
  questions jsonb not null default '[]'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete cascade,
  quiz_id uuid references public.quizzes(id) on delete cascade,
  score numeric(5,2) check (score >= 0 and score <= 100),
  feedback text,
  graded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (assignment_id is not null or quiz_id is not null)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  status text not null check (status in ('hadir','izin','sakit','alpa')),
  note text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (class_id, student_id, date)
);

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  title text not null,
  certificate_code text not null unique default upper(encode(gen_random_bytes(6),'hex')),
  issued_by uuid references public.profiles(id) on delete set null,
  issued_at timestamptz not null default now()
);

create or replace function public.current_role()
returns text language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false)
$$;

create or replace function public.is_teacher()
returns boolean language sql stable security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'guru', false)
$$;

-- Create a profile automatically for new auth users. Public signup always becomes murid.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name','Pengguna'), new.email, 'murid')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.courses enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.quizzes enable row level security;
alter table public.grades enable row level security;
alter table public.attendance enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_replies enable row level security;
alter table public.certificates enable row level security;

-- Profiles: users can see their own profile; staff can see users. Admin manages roles.
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin() or public.is_teacher());
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated
using (id = auth.uid() and role <> 'admin') with check (id = auth.uid() and role <> 'admin');
drop policy if exists "admin manages profiles" on public.profiles;
create policy "admin manages profiles" on public.profiles for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Class membership and class/course visibility.
drop policy if exists "classes read" on public.classes;
create policy "classes read" on public.classes for select to authenticated
using (public.is_admin() or teacher_id = auth.uid() or exists (
  select 1 from public.class_members m where m.class_id = id and m.student_id = auth.uid()
));
drop policy if exists "admin manages classes" on public.classes;
create policy "admin manages classes" on public.classes for all to authenticated
using (public.is_admin()) with check (public.is_admin());
drop policy if exists "teacher manages assigned classes" on public.classes;
create policy "teacher manages assigned classes" on public.classes for all to authenticated
using (teacher_id = auth.uid() and public.is_teacher())
with check (teacher_id = auth.uid() and public.is_teacher());

drop policy if exists "class members read" on public.class_members;
create policy "class members read" on public.class_members for select to authenticated
using (student_id = auth.uid() or public.is_admin() or exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()));
drop policy if exists "admin manages class members" on public.class_members;
create policy "admin manages class members" on public.class_members for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "courses read" on public.courses;
create policy "courses read" on public.courses for select to authenticated
using (public.is_admin() or created_by = auth.uid() or class_id is null or exists (select 1 from public.class_members m where m.class_id = courses.class_id and m.student_id = auth.uid()) or exists (select 1 from public.classes c where c.id = courses.class_id and c.teacher_id = auth.uid()));
drop policy if exists "staff manages courses" on public.courses;
create policy "staff manages courses" on public.courses for all to authenticated
using (public.is_admin() or (public.is_teacher() and created_by = auth.uid()))
with check (public.is_admin() or (public.is_teacher() and created_by = auth.uid()));

drop policy if exists "assignments read" on public.assignments;
create policy "assignments read" on public.assignments for select to authenticated
using (public.is_admin() or created_by = auth.uid() or class_id is null or exists (select 1 from public.class_members m where m.class_id = assignments.class_id and m.student_id = auth.uid()) or exists (select 1 from public.classes c where c.id = assignments.class_id and c.teacher_id = auth.uid()));
drop policy if exists "staff manages assignments" on public.assignments;
create policy "staff manages assignments" on public.assignments for all to authenticated
using (public.is_admin() or (public.is_teacher() and created_by = auth.uid()))
with check (public.is_admin() or (public.is_teacher() and created_by = auth.uid()));

drop policy if exists "students manage own submissions" on public.submissions;
create policy "students manage own submissions" on public.submissions for all to authenticated
using (student_id = auth.uid() or public.is_admin() or exists (select 1 from public.assignments a where a.id = assignment_id and a.created_by = auth.uid()))
with check (student_id = auth.uid() or public.is_admin());
drop policy if exists "quizzes read" on public.quizzes;
create policy "quizzes read" on public.quizzes for select to authenticated
using (public.is_admin() or created_by = auth.uid() or class_id is null or exists (select 1 from public.class_members m where m.class_id = quizzes.class_id and m.student_id = auth.uid()) or exists (select 1 from public.classes c where c.id = quizzes.class_id and c.teacher_id = auth.uid()));
drop policy if exists "staff manages quizzes" on public.quizzes;
create policy "staff manages quizzes" on public.quizzes for all to authenticated
using (public.is_admin() or (public.is_teacher() and created_by = auth.uid()))
with check (public.is_admin() or (public.is_teacher() and created_by = auth.uid()));

drop policy if exists "grades read" on public.grades;
create policy "grades read" on public.grades for select to authenticated
using (student_id = auth.uid() or public.is_admin() or graded_by = auth.uid());
drop policy if exists "staff manages grades" on public.grades;
create policy "staff manages grades" on public.grades for all to authenticated
using (public.is_admin() or (public.is_teacher() and graded_by = auth.uid()))
with check (public.is_admin() or (public.is_teacher() and graded_by = auth.uid()));

drop policy if exists "attendance read" on public.attendance;
create policy "attendance read" on public.attendance for select to authenticated
using (student_id = auth.uid() or public.is_admin() or recorded_by = auth.uid());
drop policy if exists "staff manages attendance" on public.attendance;
create policy "staff manages attendance" on public.attendance for all to authenticated
using (public.is_admin() or (public.is_teacher() and recorded_by = auth.uid()))
with check (public.is_admin() or (public.is_teacher() and recorded_by = auth.uid()));

drop policy if exists "forum posts read" on public.forum_posts;
create policy "forum posts read" on public.forum_posts for select to authenticated using (auth.uid() is not null);
drop policy if exists "users create forum posts" on public.forum_posts;
create policy "users create forum posts" on public.forum_posts for insert to authenticated with check (author_id = auth.uid());
drop policy if exists "authors or admin manage forum posts" on public.forum_posts;
create policy "authors or admin manage forum posts" on public.forum_posts for update to authenticated using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());
drop policy if exists "authors or admin delete forum posts" on public.forum_posts;
create policy "authors or admin delete forum posts" on public.forum_posts for delete to authenticated using (author_id = auth.uid() or public.is_admin());

drop policy if exists "forum replies read" on public.forum_replies;
create policy "forum replies read" on public.forum_replies for select to authenticated using (auth.uid() is not null);
drop policy if exists "users create own replies" on public.forum_replies;
create policy "users create own replies" on public.forum_replies for insert to authenticated with check (author_id = auth.uid());
drop policy if exists "authors or admin delete replies" on public.forum_replies;
create policy "authors or admin delete replies" on public.forum_replies for delete to authenticated using (author_id = auth.uid() or public.is_admin());

drop policy if exists "certificates read" on public.certificates;
create policy "certificates read" on public.certificates for select to authenticated
using (student_id = auth.uid() or public.is_admin());
drop policy if exists "admin issues certificates" on public.certificates;
create policy "admin issues certificates" on public.certificates for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Explicit grants for Supabase API roles; RLS remains the actual row-level guard.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.classes, public.class_members,
  public.courses, public.assignments, public.submissions, public.quizzes, public.grades,
  public.attendance, public.forum_posts, public.forum_replies, public.certificates to authenticated;
