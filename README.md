# IndoKerja Job Application

Aplikasi simulasi proses rekrutmen IndoKerja.id. Job seeker dapat mencari lowongan, mengirim lamaran, dan mengikuti perubahan statusnya. Company dapat menerbitkan lowongan serta mengelola kandidat dan riwayat seleksi.

Job seeker dan Company dapat memperbarui nama melalui halaman profil; Company juga dapat memperbarui nama perusahaan.

## Teknologi

- Frontend: React 18, TypeScript, Vite, lucide-react
- Backend: Node.js, TypeScript, Express 5, REST API
- Database: PostgreSQL, Prisma ORM
- Auth: JWT dalam cookie HttpOnly dan password bcrypt
- Validasi: Zod

## Menjalankan aplikasi

Prasyarat: Node.js 20.19+ (atau 22.12+), npm, dan PostgreSQL yang sedang berjalan. PostgreSQL dapat lokal atau hosted seperti Supabase.

1. Pilih PostgreSQL lokal atau hosted. Untuk PostgreSQL lokal, buat database kosong bernama `indokerja` dengan `psql`:

   ```sql
   CREATE DATABASE indokerja;
   ```

   Supabase sudah menyediakan database `postgres`; gunakan connection string Supabase dan jangan jalankan `CREATE DATABASE` di sana.

2. Salin `backend/.env.example` menjadi `backend/.env`, lalu isi `DATABASE_URL` dan `JWT_SECRET` dengan nilai lokal Anda. Gunakan secret acak minimal 24 karakter. `FRONTEND_ORIGIN` secara default menunjuk ke Vite di `http://localhost:5173`. Jangan pernah memasukkan kredensial database asli ke `.env.example` atau repository.

3. Dari direktori proyek, instal dependency dan siapkan database:

   ```bash
   npm install
   npm run db:generate
   npm run db:migrate:deploy
   npm run db:seed
   ```

   `db:migrate:deploy` menerapkan migrasi yang sudah tercatat tanpa membuat ulang database; gunakan juga untuk Supabase. Untuk mengembangkan perubahan skema secara lokal, gunakan `npm run db:migrate`.

   Jika dependency sudah pernah dipasang sebelum upgrade Prisma, jalankan kembali `npm install` agar versi package dan lockfile tersinkron.

4. Jalankan API dan frontend dalam mode development:

   ```bash
   npm run dev
   ```

   Frontend berjalan di `http://localhost:5173`, API di `http://localhost:4000`, dan health check di `http://localhost:4000/api/health`. Frontend memakai proxy `/api` ke backend agar cookie sesi tetap bekerja di browser.

Di Windows PowerShell yang membatasi skrip npm, jalankan `npm.cmd` sebagai pengganti `npm` (misalnya `npm.cmd install`). Untuk development, biarkan `VITE_API_URL=/api` agar request melewati proxy Vite.

## Build dan deployment

Build production dari direktori proyek, lalu jalankan migrasi dan server. Express menyajikan `frontend/dist`, sehingga UI dan API menggunakan satu domain:

```bash
npm run build
npm run db:migrate:deploy
npm run start
```

Untuk deployment assessment, konfigurasi [render.yaml](render.yaml) menyiapkan satu web service di Render. Hubungkan repository GitHub ke Render sebagai Blueprint, lalu isi `DATABASE_URL` saat diminta dengan connection string Supabase **Session pooler** (port `5432`) dan password database. Pastikan URI memakai `sslmode=require`; encode karakter khusus pada password. Blueprint membangun aplikasi, menjalankan migrasi dan seed demo yang aman diulang, lalu menyajikan frontend dan API di domain yang sama. Render mengisi `FRONTEND_ORIGIN` dari URL layanan.

Variabel production: `DATABASE_URL`, `JWT_SECRET` (dibuat acak oleh Render), `NODE_ENV=production`, `FRONTEND_ORIGIN`, dan `SESSION_COOKIE_SAME_SITE=lax`. Jangan simpan secret di source code. Gunakan HTTPS. Akun demo hanya untuk penilaian, jangan untuk data pengguna nyata.

Layanan Render gratis dapat tidur saat tidak digunakan; buka URL aplikasi dan tunggu layanan aktif kembali sebelum demo. Setelah deploy, verifikasi `https://<domain>/api/health` mengembalikan `{"status":"ok"}` dan coba kedua akun demo.

## Akun demo

Seed membuat dua akun berikut; keduanya memakai password `password123`.

| Peran | Email |
| --- | --- |
| Job seeker | `seeker@indokerja.id` |
| Company | `company@indokerja.id` |

Company demo memiliki nama **Nusantara Digital** dan tiga lowongan awal. Seed aman dijalankan ulang: akun yang sudah ada tidak ditimpa dan lowongan demo tidak digandakan.

## Database

Skema Prisma ada di [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma), dengan migrasi PostgreSQL di `backend/prisma/migrations/`. Relasi utama:

- Satu akun Company memiliki banyak `Job`.
- Job seeker dan lowongan memiliki relasi banyak-ke-banyak melalui `Application`.
- Constraint unik `(jobId, candidateId)` mencegah lamaran ganda di database.
- Setiap `Application` mempunyai banyak `ApplicationHistory`; status awal dan setiap perpindahan status dicatat dalam transaksi.
- Semua tabel memakai PostgreSQL RLS. Migrasi Supabase juga mencabut grant untuk role Data API `anon` dan `authenticated`; akses aplikasi tetap lewat backend yang memvalidasi sesi dan role.

## Struktur proyek

```text
backend/
  prisma/       schema, SQL migration, seed
  src/          Express app, auth, routes, middleware
frontend/
  src/          React app dan responsive styles
```

## Dokumentasi API

Dokumentasi endpoint, otorisasi, enum, dan contoh payload ada di [`docs/API.md`](docs/API.md).

## Catatan keamanan

Login membatasi percobaan per alamat IP. JWT hanya disimpan dalam cookie `HttpOnly`, bukan di `localStorage`; cookie memakai `Secure` pada production. Request perubahan data yang memakai cookie harus berasal dari origin frontend terdaftar. Semua route privat memeriksa JWT dan role, password di-hash, input divalidasi, dan error server tidak mengirim detail internal kepada klien. Email dan role akun tidak dapat diubah dari halaman profil.
