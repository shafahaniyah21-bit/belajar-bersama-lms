-- Jalankan SATU KALI di Supabase SQL Editor untuk mengaktifkan absensi mandiri.
-- Data absensi lama tidak dihapus. Admin tetap dapat mengedit dan menghapus.
-- Guru dan murid tidak dapat mengedit atau menghapus absensi.
begin;
create or replace function public.has_attendance_today(p_student_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.attendance a where a.student_id = p_student_id and a.date = (now() at time zone 'Asia/Jakarta')::date); $$;
revoke all on function public.has_attendance_today(uuid) from public;
grant execute on function public.has_attendance_today(uuid) to authenticated;
drop policy if exists "staff manages attendance" on public.attendance;
drop policy if exists "admin manages attendance" on public.attendance;
drop policy if exists "student inserts own attendance" on public.attendance;

create policy "admin manages attendance"
on public.attendance for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "student inserts own attendance"
on public.attendance for insert to authenticated
with check (
  student_id = auth.uid()
  and recorded_by = auth.uid()
  and class_id is null
  and date = (now() at time zone 'Asia/Jakarta')::date
  and status in ('hadir','izin','sakit')
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'murid'
  )
  and not public.has_attendance_today(auth.uid())
);
commit;
