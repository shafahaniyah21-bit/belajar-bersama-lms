# Fungsi hapus pengguna — Belajar Bersama

Fungsi ini harus dideploy sebagai Supabase Edge Function bernama `delete-user`. File di GitHub saja belum membuat fungsi tersedia di proyek Supabase.

## Deploy melalui Supabase Dashboard

1. Buka Supabase Dashboard dan pilih proyek LMS Belajar Bersama.
2. Buka **Edge Functions** lalu pilih **Deploy new function** / **Create function**.
3. Pilih editor/dashboard deployment jika tersedia dan beri nama persis: `delete-user`.
4. Salin seluruh kode dari `index.ts` dalam folder ini ke editor fungsi tersebut.
5. Deploy fungsi.

Fungsi memakai environment variables bawaan Edge Functions: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY`. Jangan masukkan service-role key ke Vite/Vercel atau ke kode frontend.

## Perlindungan

- Fungsi memverifikasi sesi login dan mengecek role admin di tabel `profiles`; UI saja tidak cukup untuk memberi hak akses.
- Admin tidak bisa menghapus akunnya sendiri.
- Admin terakhir tidak bisa dihapus.
- Materi, tugas, dan kuis yang dibuat pengguna yang dihapus dialihkan kepemilikannya ke admin pemohon agar foreign key tidak menghalangi penghapusan.
- Data pengguna terkait seperti pengumpulan, absensi, nilai, dan postingan/komentar dapat terhapus sesuai relasi foreign key di database.

Setelah fungsi terdeploy, deploy frontend di Vercel dan uji dari akun admin.
