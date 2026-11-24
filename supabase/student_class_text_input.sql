-- Store the class as free text on the student profile.
alter table public.profiles
  add column if not exists class_name text;

-- Use typed class text from Supabase Auth registration metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, role, nisn, class_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    'murid',
    nullif(new.raw_user_meta_data->>'nisn', ''),
    nullif(btrim(new.raw_user_meta_data->>'class_name'), '')
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        nisn = excluded.nisn,
        class_name = excluded.class_name;

  return new;
end;
$$;

-- Admin and Guru may update the student's profile NISN and typed class.
create or replace function public.update_student_academic_data(
  p_student_id uuid,
  p_nisn text,
  p_class_name text
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

  if p_class_name is null or btrim(p_class_name) = '' then
    raise exception 'Nama kelas wajib diisi.';
  end if;

  update public.profiles
  set nisn = p_nisn, class_name = btrim(p_class_name)
  where id = p_student_id and role = 'murid';
end;
$$;

revoke all on function public.update_student_academic_data(uuid,text,text) from public;
grant execute on function public.update_student_academic_data(uuid,text,text) to authenticated;
