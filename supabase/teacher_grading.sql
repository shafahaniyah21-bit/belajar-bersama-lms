-- Tambahan aman untuk fitur penilaian guru.
-- Tidak menghapus tabel atau data yang sudah ada.
-- Izinkan guru membaca pengumpulan tugas pada kelas yang mereka ampu,
-- termasuk tugas yang dibuat oleh Admin atau guru lain.
drop policy if exists "teachers read submissions for assigned classes" on public.submissions;
create policy "teachers read submissions for assigned classes"
on public.submissions
for select
to authenticated
using (
  public.is_teacher()
  and exists (
    select 1
    from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = submissions.assignment_id
      and c.teacher_id = auth.uid()
  )
);

-- Pastikan guru dapat membaca nilai yang sudah tersimpan untuk tugas
-- pada kelas yang mereka ampu, agar nilai dapat ditinjau kembali.
drop policy if exists "teachers read grades for assigned classes" on public.grades;
create policy "teachers read grades for assigned classes"
on public.grades
for select
to authenticated
using (
  public.is_teacher()
  and exists (
    select 1
    from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = grades.assignment_id
      and c.teacher_id = auth.uid()
  )
);
