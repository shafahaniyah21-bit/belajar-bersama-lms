# Belajar Bersama LMS

Starter project LMS berbasis React + Vite + Supabase Auth/PostgreSQL. Nama tampilan Admin: **Admin Belajar Bersama** (nama profil dapat diubah).

## Fitur dalam paket ini
- Autentikasi email/password Supabase.
- Peran `admin`, `guru`, `murid`; pendaftaran publik otomatis diberi peran `murid`.
- Database untuk profil, kelas, anggota kelas, materi, tugas, pengumpulan tugas, kuis, nilai, absensi, forum, balasan, dan sertifikat.
- Row Level Security (RLS) dasar di PostgreSQL.
- Dashboard responsif, manajemen pengguna/peran untuk Admin, tambah materi/tugas/diskusi, ringkasan laporan dan ekspor pengguna CSV.

## Penting: ini starter yang perlu dituntaskan
Beberapa menu skema database sudah tersedia, tetapi antarmuka CRUD lengkap untuk seluruh alur belum selesai. Pada versi awal ini, pembuatan kelas, absensi, nilai, penerbitan sertifikat, kuis interaktif, dan pengumpulan tugas masih perlu dikembangkan dan diuji sebelum dipakai secara operasional. RLS perlu ditinjau untuk kebijakan sekolah/organisasi kamu sebelum dipakai dengan data nyata.

## 1. Buat database dan autentikasi
1. Buat akun di https://supabase.com dan buat project baru.
2. Buka **SQL Editor** pada project.
3. Salin seluruh isi `supabase/schema.sql`, jalankan, dan pastikan tidak ada error.
4. Buka **Project Settings → API** (atau bagian Data API/Keys sesuai tampilan dashboard) lalu salin Project URL dan publishable/anon key. Jangan gunakan `service_role` key di frontend.
5. Buka **Authentication → URL Configuration**. Tambahkan URL lokal `http://localhost:5173` dan nanti URL hosting kamu ke Site URL/Redirect URLs yang sesuai.
6. Buka Authentication → Providers → Email. Pilih apakah verifikasi email perlu diwajibkan.

## 2. Buat akun Admin pertama
1. Jalankan aplikasi dan daftar akun dengan email milikmu.
2. Buka Supabase → **SQL Editor**. Ganti email di bawah dengan email akunmu, lalu jalankan:
   ```sql
   update public.profiles
   set role = 'admin', full_name = 'Admin Belajar Bersama'
   where email = 'EMAIL_KAMU';
   ```
3. Pastikan satu baris berubah. Jangan membagikan akses Admin. Akun publik baru tetap otomatis menjadi `murid`.
4. Login kembali agar role terbaru dimuat.

> Jika email masih belum terverifikasi dan profil belum muncul, selesaikan verifikasi atau periksa Authentication → Users serta tabel public.profiles.

## 3. Jalankan di komputer
Perlu Node.js versi LTS yang masih didukung. Ekstrak ZIP, buka terminal di folder proyek, lalu:
```bash
npm install
cp .env.example .env.local
```
Di Windows PowerShell, kamu dapat menyalin `.env.example` secara manual menjadi `.env.local`. Isi file `.env.local`:
```env
VITE_SUPABASE_URL=https://PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=PASTE_PUBLISHABLE_OR_ANON_KEY
```
Jalankan:
```bash
npm run dev
```
Buka alamat yang ditampilkan Vite, biasanya `http://localhost:5173`.

## 4. Publikasikan online menggunakan Vercel
1. Buat akun di https://github.com dan https://vercel.com.
2. Unggah folder proyek ini ke repository GitHub baru (jangan unggah `.env.local`).
3. Di Vercel, pilih **Add New → Project**, impor repository tersebut.
4. Framework preset: Vite. Build command `npm run build`; output directory `dist`.
5. Di Vercel → Project Settings → Environment Variables, tambahkan:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy. Setelah berhasil, Vercel memberikan URL publik.
7. Tambahkan URL Vercel tersebut ke Supabase Authentication → URL Configuration → Redirect URLs/Site URL, lalu redeploy jika ada perubahan environment variable.
8. Tes daftar/login, logout, akses berdasarkan peran, dan RLS dari dua akun berbeda.

## 5. Keamanan sebelum dipakai sungguhan
- Jangan pernah memasukkan password admin ke kode, GitHub, atau chat.
- Jangan masukkan `service_role` key ke frontend, `.env` publik, atau GitHub.
- Aktifkan verifikasi email dan kebijakan password yang sesuai.
- Tinjau RLS untuk memastikan guru hanya dapat mengelola kelas yang ditugaskan dan murid hanya dapat melihat data miliknya/kelasnya.
- Buat backup dan uji pemulihan data.
- Tambahkan rate limits, validasi input, audit log, aturan file storage, dan kebijakan privasi jika menyimpan data murid.
- Kebijakan `profiles` pada starter ini memperbolehkan Admin mengelola profil, tetapi untuk produksi sebaiknya gunakan mekanisme aman yang mencegah Admin menurunkan/menonaktifkan dirinya sendiri secara tidak sengaja.
- Uji alur sertifikat, nilai, kuis, absensi, dan pengumpulan tugas sebelum menyebutnya siap produksi.

## Struktur
```
src/
  App.jsx
  main.jsx
  style.css
supabase/
  schema.sql
.env.example
```

## Troubleshooting
- `Database belum dikonfigurasi`: pastikan file `.env.local` ada di root proyek, nilai variabel benar, lalu restart `npm run dev`.
- `Invalid API key`: gunakan Project URL dan publishable/anon key dari project yang sama.
- Profil tidak ada: pastikan SQL schema dan trigger `on_auth_user_created` berhasil dibuat.
- Akun tidak bisa melihat data: periksa role pada `public.profiles` dan kebijakan RLS.
