-- Jalankan SATU KALI di Supabase SQL Editor untuk mengaktifkan absensi mandiri.
-- Data absensi lama tidak dihapus. Admin tetap dapat mengedit dan menghapus.
-- Guru dan murid tidak dapat mengedit atau menghapus absensi.
begin;
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
  and date = current_date
  and status in ('hadir','izin','sakit')
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'murid'
  )
  and not exists (
    select 1 from public.attendance existing
    where existing.student_id = auth.uid()
      and existing.date = current_date
  )
);
commit;
