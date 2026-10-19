# IndoKerja REST API

Base URL lokal: `http://localhost:4000/api`  
Request/response menggunakan JSON UTF-8. Browser harus mengirim cookie dengan `credentials: "include"`.

## Autentikasi dan otorisasi

| Role | Nilai API | Akses |
| --- | --- | --- |
| Job seeker | `JOB_SEEKER` | Browse lowongan, apply, lihat lamaran sendiri |
| Company | `COMPANY` | Buat lowongan milik sendiri, lihat kandidat lowongan sendiri, ubah status |

Login membuat JWT berumur maksimal 7 hari di cookie `indokerja_session` yang beratribut `HttpOnly`, `SameSite`, dan `Secure` saat production. JavaScript frontend tidak menerima atau menyimpan token. `rememberMe: false` membuat cookie berakhir saat browser ditutup. Seluruh endpoint lowongan publik dapat dibaca tanpa login; endpoint privat memeriksa sesi dan role.

Untuk request perubahan data dengan cookie sesi, API memeriksa header `Origin` terhadap `FRONTEND_ORIGIN` sebagai perlindungan CSRF. `FRONTEND_ORIGIN` dapat berisi beberapa origin yang dipisahkan koma.

## Endpoint

| Method | Path | Auth | Keterangan |
| --- | --- | --- | --- |
| `GET` | `/health` | Publik | Cek API hidup |
| `POST` | `/auth/login` | Publik | Login dan menerima cookie sesi |
| `GET` | `/auth/me` | Semua role | Profil akun dari sesi |
| `PATCH` | `/auth/me` | Semua role | Memperbarui nama; Company juga dapat memperbarui nama perusahaan |
| `POST` | `/auth/logout` | Publik | Menghapus cookie sesi |
| `GET` | `/jobs` | Publik | Daftar lowongan aktif |
| `GET` | `/jobs/:id` | Publik | Detail lowongan aktif |
| `POST` | `/jobs` | Company | Membuat lowongan |
| `GET` | `/jobs/company/mine` | Company | Daftar lowongan milik company login |
| `GET` | `/jobs/:id/applications` | Company | Kandidat dan histori pada lowongan miliknya |
| `POST` | `/applications` | Job seeker | Mengirim lamaran |
| `GET` | `/applications/mine` | Job seeker | Daftar lamaran dan histori miliknya |
| `PATCH` | `/applications/:id/status` | Company | Mengubah status kandidat pada lowongan miliknya |

`GET /jobs` menerima query opsional `q`, `location`, dan `type`. Tipe pekerjaan: `FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERNSHIP`, `FREELANCE`.

### Contoh payload

Login (opsional `rememberMe`, default `true`):

```json
{ "email": "seeker@indokerja.id", "password": "password123", "rememberMe": true }
```

Respons login berisi objek `user`; server mengirim cookie sesi melalui header `Set-Cookie`. Gunakan cookie jar saat mencoba API lewat command line, dan jangan menyalin token ke frontend.

Perbarui profil (Job seeker):

```json
{ "name": "Naldi Pradita" }
```

Perbarui profil (Company):

```json
{ "name": "Admin Perusahaan", "companyName": "Nusantara Digital" }
```

Email dan role tidak dapat diubah melalui endpoint profil.
Nama wajib 2–100 karakter; nama perusahaan wajib untuk Company dan dibatasi 2–120 karakter.

Buat lowongan (Company):

```json
{
  "title": "Product Designer",
  "description": "Deskripsi pekerjaan minimal 30 karakter.",
  "location": "Jakarta (Hybrid)",
  "salaryMin": 8000000,
  "salaryMax": 12000000,
  "type": "FULL_TIME"
}
```

`salaryMin` dan `salaryMax` boleh `null` atau dihilangkan. Nilainya bilangan bulat dalam Rupiah per bulan.

Apply (Job seeker):

```json
{ "jobId": "job_id", "coverLetter": "Opsional, maksimal 3000 karakter." }
```

Ubah status (Company):

```json
{ "status": "REVIEWING", "note": "Opsional, maksimal 500 karakter." }
```

Status yang diterima: `APPLIED`, `REVIEWING`, `SHORTLISTED`, `REJECTED`, `ACCEPTED`. Perubahan status dan penulisan `ApplicationHistory` berada dalam satu transaksi. Status awal `APPLIED` juga masuk histori ketika lamaran dikirim. Request duplikat untuk job seeker dan lowongan yang sama mendapatkan `409 Conflict`.

## Respons error

Error memakai bentuk `{ "error": "pesan" }`. Kesalahan validasi mengembalikan HTTP `400` dengan tambahan `details: [{ "field": "...", "message": "..." }]`. Kode umum: `400` input tidak valid, `401` sesi/login tidak valid, `403` role atau origin tidak diizinkan, `404` data/endpoint tidak ada, `409` duplikasi atau perubahan bersamaan, `500` kesalahan server.
