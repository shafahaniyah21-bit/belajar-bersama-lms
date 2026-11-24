-- Allow Admin and Guru to edit student NISN/class even before first attendance.
-- Keep profile data as fallback and synchronize all existing attendance rows.
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

  update public.attendance
  set nisn = p_nisn, class_id = p_class_id
  where student_id = p_student_id;
end;
$$;

revoke all on function public.update_student_academic_data(uuid,text,uuid) from public;
grant execute on function public.update_student_academic_data(uuid,text,uuid) to authenticated;
