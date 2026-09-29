# CentroAbsen — Prompt Penyelarasan dengan EMS-Portal

Referensi: https://github.com/HelmiMuhammadHatta/EMS-Portal

Dokumen ini menggantikan Prompt R1 dan R2 versi sebelumnya (yang masih generik). Isinya disusun dari **README** repo referensi. Source code, ERD, dan screenshot belum terbaca, jadi detail seperti daftar permission lengkap, skema tabel, dan endpoint akan diekstrak oleh Antigravity di Prompt R1.

## Yang ditemukan di README referensi

| Area | Isi referensi |
|---|---|
| Stack | ASP.NET Core 8 Web API, EF Core, PostgreSQL, Serilog, FluentValidation, JWT + BCrypt; React 18 + Vite + TypeScript, TanStack Query, Tailwind, Recharts; Docker, xUnit |
| Arsitektur | Clean Architecture: EMS.Domain, EMS.Application, EMS.Infrastructure, EMS.API, EMS.Tests |
| RBAC | **Berbasis permission granular** (contoh `employee.read`, `leave.approve`); role dinamis dari database, tanpa ubah kode |
| Karyawan | Hierarki Manager-Subordinate tanpa circular reference, Department, Position (CRUD), dokumen karyawan (.pdf/.jpg/.png: KTP, Ijazah, Kontrak) dengan upload, download, hapus fisik |
| Audit | Audit trail otomatis lewat override `SaveChangesAsync`, mencatat nilai lama vs baru, hanya field yang berubah |
| Cuti | Approval ke Manager (setujui/tolak dengan catatan), filter jenis cuti berdasarkan gender (Cuti Melahirkan hanya perempuan) |
| Absensi | Geofencing Haversine, clock-in/out, **shift rotasi** (grup rotasi multi-minggu, generator jadwal, override manual, resolusi shift efektif) |
| Dashboard | Sapaan personal, statistik karyawan dan departemen, tren kehadiran, status cuti (Recharts) |

## Keputusan default di prompt (ubah bila tidak cocok)

**Ikut disamakan dengan referensi:**
- RBAC berbasis permission dengan role dinamis di database (menggantikan enum peran).
- Department, Position, dan hierarki atasan-bawahan dengan validasi circular reference.
- Audit trail otomatis untuk perubahan data.
- Dokumen karyawan (akses HR/Admin saja).
- Filter jenis cuti berdasarkan gender.
- Dashboard analitik dengan pola yang sama.
- Struktur folder, pola halaman, layout, dan alur layar frontend.

**Tetap khas CentroAbsen (tidak ada di referensi):**
- Foto kamera langsung, mode kerja Kantor/WFH/WFA, idempotency, flag tinjauan HR.
- Alur pengajuan keuangan Karyawan -> Atasan -> CEO -> Keuangan (pencairan).
- Satu aplikasi, satu login, kotak masuk persetujuan terpadu.

**Ditunda:** shift rotasi. Kamu sudah memutuskan jam kerja tetap untuk fase 1. Model data dibuat agar mudah ditambah nanti.

**Stack:** default tetap **Node.js + MariaDB** (pilihan terakhirmu). Yang disalin adalah model dan flow, bukan bahasa pemrogramannya. Jika ingin stack persis sama dengan referensi, ganti blok STACK di Prompt R2 dengan blok alternatif di bagian akhir dokumen ini.

## Urutan yang disarankan

**8B -> R1 -> R2 -> 9A -> 9B revisi -> 10**

R1 dan R2 dipindah sebelum 9A karena referensi memakai RBAC berbasis permission. Peran CEO dan hak approval di 9A/9B lebih baik langsung dibangun di atas model itu, bukan enum yang nanti dirombak lagi.

Tambahkan kalimat ini di awal Prompt 9A dan 9B revisi:

```
Proyek sudah memakai RBAC berbasis permission (lihat docs/ALIGNMENT.md dan docs/REFERENCE-EMS.md). Semua "peran" dan "hak approval" pada prompt ini harus diimplementasikan sebagai role dan permission di database, bukan sebagai enum atau pengecekan nama peran.
```

---

## Prompt R1 — Analisis mendalam EMS-Portal (hanya baca)

```
TAHAP R1: analisis proyek referensi. MODE READ-ONLY: jangan mengubah repo referensi.

Sumber: https://github.com/HelmiMuhammadHatta/EMS-Portal (clone ke folder /reference/EMS-Portal di luar source aplikasi, abaikan node_modules, bin, obj, .git). Salinan lokal frontend ada di C:\RBAC_Auth\EmployeeManagementSystem\ems-frontend bila perlu dibandingkan. Jangan menyalin secret, connection string, JWT secret, atau kredensial default ke dokumen mana pun.

Baca seluruh source (EMS.Domain, EMS.Application, EMS.Infrastructure, EMS.API, EMS.Tests, ems-frontend, docker-compose.yml, Dockerfile.backend, .github/workflows) beserta docs/erd.png dan docs/screenshots. Jalankan referensi jika memungkinkan (docker-compose atau lokal) untuk memverifikasi flow secara nyata; laporkan jika gagal.

Tulis docs/REFERENCE-EMS.md dengan bagian berikut:
1. Stack, versi, dan struktur solusi (tree ringkas beserta fungsi tiap folder/project) dan konvensi penamaan.
2. Model data: seluruh entitas, kolom penting, relasi, enum, dan indeks (ekstrak dari entity/migration dan ERD).
3. RBAC berbasis permission: KATALOG LENGKAP permission (kode, deskripsi), daftar role default beserta pemetaan role-permission, cara role dan permission dibuat dan dikelola, cara permission masuk ke JWT atau dimuat saat request, policy/handler otorisasi di backend, dan mekanisme di frontend (guard route, hook atau komponen pengecekan permission, penentuan menu).
4. Alur autentikasi end-to-end: login, hash password, isi token, masa berlaku, penyimpanan token di frontend, interceptor, logout, penanganan 401/403, redirect.
5. Modul Karyawan: seluruh endpoint dan layar; validasi hierarki tanpa circular reference; CRUD Department dan Position; alur dokumen (validasi tipe/ukuran, lokasi simpan, unduh, hapus fisik); mekanisme audit trail (interceptor SaveChanges, format nilai lama/baru, layar untuk melihat log).
6. Modul Cuti: jenis cuti, saldo, state machine status, alur approval, catatan penolakan, filter gender, endpoint dan layar.
7. Modul Absensi: endpoint clock-in/out, rumus Haversine dan aturan radius, riwayat, dan (hanya didokumentasikan, jangan diporting) shift rotasi beserta resolusi shift efektif.
8. Dashboard: statistik dan grafik yang ditampilkan, endpoint sumber datanya, dan komponen frontend.
9. Frontend: struktur folder, routing, layout dan sidebar, pola pemanggilan API dengan TanStack Query, pola form dan validasi, tabel, notifikasi/toast, penanganan error, dan gaya visual (rangkum dari screenshot).
10. Docker dan CI, serta pola pengujian di EMS.Tests.

Tulis juga docs/REFERENCE-GAPS.md: kelemahan atau celah yang kamu temukan (mis. token di localStorage, permission hanya dicek di frontend, kredensial default, kurang validasi, cakupan test). Catat saja, jangan memperbaiki referensi.

Ringkas dan sebut lokasi file; jangan menempel kode mentah dalam jumlah besar. Akhiri dengan ringkasan temuan utama dan daftar pertanyaan untuk hal yang ambigu.
```

---

## Prompt R2 — Menyamakan CentroAbsen dengan model EMS

```
TAHAP R2: selaraskan CentroAbsen dengan model dan flow EMS-Portal. Baca docs/REFERENCE-EMS.md, docs/REFERENCE-GAPS.md, AGENTS.md, docs/PRD.md, docs/UI-SPEC.md, dan docs/DECISIONS.md.

TUJUAN
Model RBAC, model data karyawan, alur autentikasi, struktur aplikasi, dan flow layar CentroAbsen dibuat SAMA dengan referensi. Fitur khas CentroAbsen tetap ada dan dibangun di atas model itu: absensi foto kamera + lokasi + mode kerja Kantor/WFH/WFA, cuti, pengajuan keuangan (Reimbursement dan Pembelian), dan prinsip satu aplikasi dengan satu login.

CAKUPAN
IKUT disamakan dengan referensi:
1. RBAC berbasis permission granular dengan role dinamis di database. Ganti enum peran (Employee, Manager, Finance, HrAdmin) menjadi tabel roles, permissions, dan role_permissions (serta user_roles bila referensi memakainya). Gunakan konvensi penamaan kode permission yang sama dengan referensi (resource.action). Seed role: Employee, Manager, Finance, Executive (CEO), HrAdmin. Tambahkan permission khas CentroAbsen, misalnya: attendance.checkin, attendance.read.self, attendance.read.team, attendance.read.all, leave.request, leave.approve.manager, leave.approve.hr, finance.request, finance.approve.manager, finance.approve.executive, finance.disburse, report.read, report.export, workLocation.manage, settings.manage, role.manage, audit.read. Sesuaikan nama dengan pola referensi.
2. Model karyawan: Department (menggantikan divisions), Position, hierarki atasan-bawahan dengan validasi circular reference (di backend dan pesan error yang jelas di frontend), field gender untuk filter jenis cuti (Cuti Melahirkan hanya untuk perempuan).
3. Audit trail otomatis: catat create/update/delete entitas penting (karyawan, role, permission, lokasi kerja, jenis cuti, pengaturan, pengajuan) dengan nilai lama vs baru dan hanya field yang berubah. Implementasikan lewat mekanisme ORM yang setara dengan override SaveChanges di referensi (mis. Prisma client extension atau middleware). Sediakan layar log audit untuk pemegang permission audit.read.
4. Dokumen karyawan (KTP, Ijazah, Kontrak): upload, validasi tipe dan ukuran, unduh, dan hapus fisik; hanya untuk HR/Admin (permission khusus). Simpan lewat FileStorage.
5. Dashboard analitik dengan pola yang sama: sapaan personal, statistik karyawan dan departemen, tren kehadiran, status cuti; tambahkan ringkasan persetujuan dan pencairan sesuai permission.
6. Struktur frontend: tiru struktur folder, penamaan, pola halaman, layout, sidebar, pola TanStack Query, form, tabel, toast, dan gaya visual referensi. Menu dan route guard ditentukan dari permission yang dikirim endpoint /me. Backend tetap sumber kebenaran (403 bila tanpa permission).

TETAP KHAS CENTROABSEN (jangan dihapus)
- Absensi foto, geofencing hanya untuk mode Kantor, idempotency, flag tinjauan HR.
- Alur pengajuan keuangan Karyawan -> Atasan -> CEO -> Keuangan (pencairan), diimplementasikan di atas approver berbasis permission.
- Kotak masuk persetujuan terpadu dan satu login.
- Keamanan: cookie httpOnly, proteksi CSRF, validasi di backend, lockout, rate limiting. Tiru FLOW referensi, tetapi jangan meniru celah yang tercatat di REFERENCE-GAPS.md.

DITUNDA: shift rotasi (jam kerja tetap pada fase 1). Jangan membuat tabel atau UI shift, tetapi jaga agar penentuan jam kerja lewat satu fungsi terpusat sehingga mudah diganti nanti.

LANGKAH
1. Buat docs/ALIGNMENT.md: tabel pemetaan entitas, permission, route, dan layar referensi ke padanannya di CentroAbsen (mana diganti, ditambah, diubah, ditunda) beserta daftar konflik dan keputusan. Tampilkan tabel ini dan BERHENTI menunggu konfirmasi sebelum refactor besar.
2. Setelah dikonfirmasi: migrasi database (role enum ke roles/permissions, divisions ke departments, tambah positions, dokumen, audit), seed, dan migrasi data yang ada tanpa kehilangan data.
3. Refactor backend: otorisasi berbasis permission (middleware atau policy terpusat), /me mengembalikan role dan permission, audit trail otomatis, modul departemen, posisi, dokumen, dan hierarki.
4. Refactor frontend sesuai struktur dan flow referensi, termasuk layar manajemen karyawan (daftar, tambah, ubah, detail, dokumen, riwayat audit), department, position, dan manajemen role/permission.
5. Pastikan seluruh fitur CentroAbsen tetap berjalan; perbarui seed, OpenAPI, dan docs (PRD, UI-SPEC, DECISIONS).
6. Test: unit test otorisasi berbasis permission dan validasi circular reference; integrasi test audit trail dan dokumen; e2e untuk login tiap role, akses ditolak tanpa permission, manajemen karyawan, serta alur absensi dan approval. Laporkan hasil test yang sebenarnya dan daftar selisih yang sengaja dipertahankan.
```

---

## Blok STACK alternatif (jika ingin persis sama dengan referensi)

Ganti bagian STACK di Prompt R2 dan seluruh prompt lain dengan blok ini. Perubahan ini berarti membangun ulang backend dan mengganti MariaDB dengan PostgreSQL, jadi sebaiknya diputuskan sebelum menjalankan R2.

```
STACK (mengikuti EMS-Portal)
- Backend: ASP.NET Core 8 Web API, Clean Architecture (Domain, Application, Infrastructure, API, Tests), EF Core + PostgreSQL, Serilog, FluentValidation, JWT + BCrypt, audit trail lewat override SaveChangesAsync, Swagger.
- Frontend: React 18 + Vite + TypeScript, TanStack Query, Tailwind CSS, Recharts, dengan PWA (vite-plugin-pwa).
- Infra: Docker Compose, xUnit untuk test backend, Playwright untuk e2e.
Catatan: fitur khas CentroAbsen (foto, WFH/WFA, approval keuangan empat langkah, pencairan) tetap dibangun di atas stack ini.
```
