-- Student registration data is stored in profiles, not derived from attendance.
alter table public.profiles
  add column if not exists nisn text,
  add column if not exists class_id uuid references public.classes(id) on delete set null;

-- Class names are needed on the public registration form before a user signs in.
drop policy if exists "classes visible for registration" on public.classes;
create policy "classes visible for registration"
on public.classes for select to anon, authenticated
using (true);

-- Create the profile using registration metadata from Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, role, nisn, class_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    'murid',
    nullif(new.raw_user_meta_data->>'nisn', ''),
    nullif(new.raw_user_meta_data->>'class_id', '')::uuid
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        nisn = excluded.nisn,
        class_id = excluded.class_id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Admin and Guru edit the student's profile fields only.
create or replace function public.update_student_academic_data(
  p_student_id uuid,
  p_nisn text,
  p_class_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid();

  if v_role not in ('admin','guru') then
    raise exception 'Hanya Admin dan Guru yang dapat mengubah data murid.';
  end if;

  if not exists (
    select 1 from public.profiles s
    where s.id = p_student_id and s.role = 'murid'
  ) then
    raise exception 'Akun murid tidak ditemukan.';
  end if;

  if p_nisn is null or p_nisn !~ '^[0-9]+$' then
    raise exception 'NISN wajib diisi dengan angka saja.';
  end if;

  if p_class_id is not null and not exists (
    select 1 from public.classes c where c.id = p_class_id
  ) then
    raise exception 'Kelas yang dipilih tidak ditemukan.';
  end if;

  update public.profiles
  set nisn = p_nisn, class_id = p_class_id
  where id = p_student_id and role = 'murid';
end;
$$;

revoke all on function public.update_student_academic_data(uuid,text,uuid) from public;
grant execute on function public.update_student_academic_data(uuid,text,uuid) to authenticated;
