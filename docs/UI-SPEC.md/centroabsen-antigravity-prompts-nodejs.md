# CentroAbsen — Prompt Eksekusi untuk Antigravity (Node.js + MariaDB)

Kumpulan prompt bertahap (0 sampai 8) untuk membangun aplikasi absensi karyawan **CentroAbsen** (PWA) dari nol sampai siap produksi.

## Keputusan yang dipakai

- **PWA**, mobile-first untuk karyawan, dashboard desktop untuk Atasan/Keuangan/HR.
- **100 karyawan.** Karena bisa WFH/WFA, radius kantor hanya berlaku untuk mode kerja "Kantor". Untuk WFH/WFA lokasi tetap dicatat, tanpa batas radius.
- **Jam kerja tetap** 08.00-17.00 WIB, tanpa shift.
- **Pengajuan keuangan** hanya Reimbursement dan Pembelian (misalnya langganan Claude Pro). Kasbon tidak dipakai.
- **Stack** (semuanya TypeScript di atas Node.js):
  - Backend: Express.js (v5) + TypeScript, Prisma ORM, Zod untuk validasi.
  - Frontend: Next.js (React) + TypeScript.
  - Database: **MariaDB** 11.4 LTS.
  - Monorepo dengan pnpm workspaces; paket `packages/shared` berisi skema Zod dan enum yang dipakai bersama oleh backend dan frontend.
  - Infra: Docker Compose.

## Cara pakai di Antigravity

1. Buat folder project kosong, lalu simpan prompt UI/UX CentroAbsen kamu sebagai `docs/UI-SPEC.md`.
2. Jalankan prompt **0 sampai 8 berurutan**, masing-masing di conversation/agent baru.
3. Tunggu tiap tahap selesai, jalankan test dan cek hasilnya sebelum lanjut. Prompt 5-7 butuh backend dari prompt 1-4 sudah jalan.

## Hal yang perlu dicek sebelum mulai

- **Alur cuti:** diasumsikan Atasan, lalu HR hanya untuk jenis cuti tertentu (misalnya melahirkan). Jika semua cuti harus lewat HR, ubah `requires_hr_approval` di Prompt 1 dan 4.
- **Batas nominal:** belum ada aturan seperti "di atas Rp 5 juta butuh approval tambahan". Jika ada, tambahkan ke Prompt 4.
- **Mock location:** PWA tidak bisa mendeteksi lokasi palsu secara andal. Mitigasinya foto langsung, waktu server, akurasi GPS, dan flag untuk ditinjau HR.
- **Job terjadwal:** memakai `node-cron` di dalam proses API (tanpa Redis) dengan kunci `GET_LOCK` MariaDB. Cukup untuk 100 karyawan; kalau nanti API dijalankan lebih dari satu instance, kunci itu mencegah job berjalan ganda.
- **Tipe JSON:** kolom JSON di MariaDB hanyalah alias LONGTEXT dan sering bermasalah di ORM. Karena itu prompt memakai tabel terpisah atau teks JSON biasa, bukan tipe JSON.

---

## Prompt 0 — Konteks proyek dan aturan kerja

Tempel juga ke rules/AGENTS.md project supaya berlaku di semua tahap.

```
Kamu adalah tim engineer senior yang membangun "CentroAbsen", aplikasi absensi karyawan berbasis PWA, dari nol sampai siap produksi. Simpan seluruh konteks di bawah sebagai docs/PRD.md dan ringkasannya sebagai AGENTS.md di root repo.

TUJUAN PRODUK
1. Absensi masuk/keluar dengan foto kamera langsung, lokasi GPS, dan waktu server.
2. Pengajuan dan approval cuti.
3. Pengajuan keuangan (Reimbursement dan Pembelian, misalnya langganan Claude Pro) dengan approval berjenjang.
4. Pengelolaan karyawan, lokasi kerja, kebijakan cuti, dan laporan oleh HR/Admin.
Fase 1 saja. Data absensi harus rapi agar nanti bisa dikembangkan menjadi payroll, tetapi payroll, slip gaji, pajak, BPJS, lembur otomatis, fingerprint, dan shift DILARANG dibuat sekarang dan tidak boleh muncul di navigasi.

SKALA DAN KONTEKS
- Sekitar 100 karyawan, zona waktu WIB (simpan UTC di database, tampilkan WIB).
- Jam kerja tetap 08.00-17.00 WIB (dapat dikonfigurasi HR), toleransi keterlambatan default 0 menit.
- Karyawan bisa bekerja dari Kantor, WFH, atau WFA (work from anywhere).

PERAN
Karyawan, Atasan, Keuangan, HR/Admin. Setiap karyawan punya satu atasan langsung (manager_id). Tidak boleh menyetujui pengajuan sendiri.

STACK (ikuti, jangan ganti tanpa izin; semuanya TypeScript strict di atas Node.js LTS terbaru)
- Monorepo pnpm workspaces: apps/api, apps/web, packages/shared (skema Zod, enum, tipe bersama, konstanta status).
- Backend: Express.js v5, Prisma ORM (provider mysql, target MariaDB 11.4), Zod untuk validasi request, pino untuk logging, helmet, express-rate-limit, cookie-parser, multer (memory storage dengan batas ukuran), sharp untuk memproses foto, file-type untuk validasi isi file, argon2 untuk hash password, jose atau jsonwebtoken untuk JWT, nodemailer untuk email, exceljs untuk ekspor Excel, luxon untuk zona waktu, node-cron untuk job terjadwal.
- Frontend: Next.js (App Router) + React, Tailwind CSS, TanStack Query, react-hook-form + zod, Lucide icons, Leaflet + OpenStreetMap untuk peta, Recharts untuk grafik, font Plus Jakarta Sans.
- Database: MariaDB 11.4 LTS, engine InnoDB, charset utf8mb4, collation utf8mb4_unicode_ci. Primary key berupa UUID (v7 dibuat di aplikasi) disimpan sebagai CHAR(36). Waktu disimpan sebagai DATETIME(3) dalam UTC. Jangan memakai tipe JSON bawaan MariaDB; simpan data semi-terstruktur sebagai LONGTEXT berisi JSON string atau pakai tabel terpisah.
- Infra: Docker Compose (api, web, mariadb, reverse proxy, mailpit untuk dev), penyimpanan file lewat abstraksi FileStorage (implementasi disk lokal, siap diganti S3/MinIO).
- Test: Vitest + Supertest + Testcontainers (MariaDB) untuk backend, Vitest + Testing Library untuk frontend, Playwright untuk e2e.

ATURAN KERJA
- Sebelum menulis kode di setiap tahap: buat implementation plan singkat, lalu kerjakan sesuai plan.
- Kerjakan hanya yang diminta di tahap tersebut. Jangan menambah fitur di luar scope.
- Jika ada keputusan bisnis yang ambigu, pilih default yang paling aman, tulis di docs/DECISIONS.md, jangan mengarang diam-diam.
- Setiap tahap harus diakhiri dengan: build lulus, lint dan typecheck lulus, test lulus, ringkasan perubahan, dan daftar hal yang belum dikerjakan.
- Semua teks UI, pesan error, status, dan contoh data dalam Bahasa Indonesia; kode, nama variabel, dan nama tabel dalam Bahasa Inggris.
- Jangan pernah menaruh secret di repo; gunakan .env.example dan validasi environment variable saat startup dengan Zod.
- Commit kecil dengan pesan jelas (conventional commits).

Balas hanya dengan konfirmasi singkat bahwa docs/PRD.md dan AGENTS.md sudah dibuat.
```

---

## Prompt 1 — Fondasi repo, backend, dan database

```
Baca AGENTS.md dan docs/PRD.md. Kerjakan TAHAP 1: fondasi.

1. Struktur monorepo pnpm: /apps/api (Express + TypeScript), /apps/web (Next.js), /packages/shared, /docs, /infra (docker compose, reverse proxy). Konfigurasi TypeScript strict, ESLint, Prettier, dan skrip root (dev, build, lint, typecheck, test). Reverse proxy melayani web di "/" dan API di "/api" pada satu origin agar cookie aman.
2. Docker Compose untuk development: mariadb (11.4, volume, utf8mb4, timezone UTC), api, web, mailpit. Satu perintah "docker compose up" harus menjalankan semuanya. Sertakan healthcheck.
3. Backend: arsitektur berlapis yang jelas (routes -> controllers -> services -> repositories/Prisma, dengan modul per domain: auth, users, attendance, leave, finance, approvals, reports, notifications). Setup pino (redact data sensitif), global error handler (respons error seragam berbahasa Indonesia dengan kode error), request id, helmet, CORS ketat, versioning API (/api/v1), dokumentasi OpenAPI/Swagger untuk development (boleh dibangkitkan dari skema Zod), endpoint /health, dan endpoint GET /api/v1/time yang mengembalikan waktu server (UTC dan WIB) untuk sinkronisasi jam di klien.
4. Database dengan Prisma (migrations, nama tabel snake_case lewat @@map, semua tabel punya created_at/updated_at):
   - users (id, nik unik, full_name, email unik, password_hash, role [Employee|Manager|Finance|HrAdmin], manager_id, division_id, primary_work_location_id nullable, work_arrangement [Office|Hybrid|Flexible], is_active, photo_path, failed_login_count, locked_until)
   - divisions
   - work_locations (name, address, latitude DECIMAL(9,6), longitude DECIMAL(9,6), radius_meters, work_start, work_end, late_tolerance_minutes, is_active)
   - attendances (user_id, work_date DATE, type [CheckIn|CheckOut], server_time_utc, client_captured_at, latitude, longitude, accuracy_meters, distance_from_office_meters, work_location_id, work_mode [Office|Home|Anywhere], photo_path, status, status_minutes, status_note, idempotency_key unik). Constraint unik (user_id, work_date, type).
   - attendance_flags (attendance_id, flag) sebagai pengganti kolom JSON
   - holidays (date unik, name)
   - leave_types (name, annual_quota_days, requires_attachment, requires_hr_approval, is_active)
   - leave_balances (user_id, leave_type_id, year, quota, used; unik user+jenis+tahun)
   - leave_requests (user_id, leave_type_id, start_date, end_date, total_work_days, reason, status, cancelled_at)
   - finance_requests (user_id, kind [Reimbursement|Purchase], category, amount_idr DECIMAL(18,2), description, status, cancelled_at)
   - request_attachments (request_type, request_id, file_path, original_name, content_type, size_bytes)
   - approval_steps (request_type, request_id, step_order, role_required, assigned_to_user_id, status [Pending|Approved|Rejected|Skipped], acted_by, acted_at, note)
   - notifications (user_id, title, body, link, is_read)
   - audit_logs (actor_id, action, entity, entity_id, before_json LONGTEXT, after_json LONGTEXT, ip, at)
   - refresh_tokens (simpan hash, family id, expires_at, revoked_at)
   - password_reset_tokens (simpan hash, expires_at, used_at)
   - app_settings (key/value: retensi foto bulan, kebijakan default)
   Tambahkan index yang masuk akal (attendances by user_id+work_date, approval_steps by assigned_to_user_id+status, notifications by user_id+is_read).
5. Seed data realistis Indonesia untuk development (skrip Prisma seed, hanya berjalan di environment development): 1 HR/Admin, 1 Keuangan (Siti Rahma, Finance), 3 Atasan, sekitar 100 karyawan di beberapa divisi (Andi Pratama - Product, Budi Santoso - Operations, dst.), 2 lokasi kerja (Kantor Pusat Jakarta radius 150 m, satu lokasi lain), jenis cuti (Cuti Tahunan 12 hari, Cuti Sakit dengan lampiran, Cuti Melahirkan dengan persetujuan HR, Cuti Penting), libur nasional Indonesia tahun berjalan, dan beberapa riwayat absensi contoh.
6. Paket shared: enum peran/status/mode kerja, skema Zod untuk payload utama, dan konstanta pesan status, diimpor oleh api dan web.
7. Tulis README dengan cara menjalankan proyek.

Selesai bila: docker compose up berhasil, migrasi dan seed berjalan di MariaDB, /health dan /api/v1/time merespons, dan ada test integrasi minimal dengan Testcontainers (MariaDB).
```

---

## Prompt 2 — Autentikasi, RBAC, dan master data

```
Kerjakan TAHAP 2: autentikasi, otorisasi, dan API master data. Backend saja.

AUTENTIKASI
- Login dengan NIK atau email + password. Password di-hash dengan Argon2id (paket argon2).
- Access token JWT berumur 15 menit dan refresh token rotasi dengan deteksi pemakaian ulang (simpan hash-nya, cabut seluruh family jika token lama dipakai lagi), keduanya dikirim sebagai cookie httpOnly, Secure (di production), SameSite=Lax. Sediakan endpoint login, refresh, logout, dan me.
- Perlindungan CSRF untuk semua request yang mengubah data: wajibkan header kustom (misalnya X-CentroAbsen-Client) atau double-submit token, dan tolak jika tidak ada.
- Lockout: 5 kali gagal login mengunci akun 15 menit; pesan error tidak membocorkan apakah akun ada.
- Lupa password: endpoint minta reset (kirim email berisi tautan bertoken sekali pakai berumur 30 menit lewat nodemailer; di dev ke Mailpit) dan endpoint set password baru. Ganti password di profil (wajib password lama). Reset dan ganti password mencabut semua refresh token pengguna.
- Rate limiting untuk endpoint login dan lupa password.

OTORISASI
- Middleware berbasis peran: Employee, Manager, Finance, HrAdmin. Aturan akses data: karyawan hanya melihat datanya sendiri; Atasan melihat data bawahan langsungnya; Keuangan hanya pengajuan finansial yang sudah melewati atasan; HR/Admin melihat semua. Implementasikan sebagai modul policy terpusat yang dipanggil service (bukan pengecekan tersebar di controller), sehingga mudah diuji.

API MASTER DATA (semua divalidasi Zod, ada pagination, pencarian, dan filter)
- Karyawan: daftar, detail, tambah, ubah, nonaktifkan (tidak ada hapus permanen). Wajib: NIK unik, email unik, peran, atasan, divisi, lokasi kerja utama, work_arrangement. Saat karyawan dibuat, buat saldo cuti tahun berjalan otomatis dan kirim email undangan set password.
- Divisi: CRUD.
- Lokasi kerja: CRUD dengan validasi koordinat dan radius (50-1000 m), jam kerja, toleransi terlambat.
- Jenis cuti dan kuota: CRUD; endpoint penyesuaian saldo cuti oleh HR (dengan catatan, tercatat di audit log).
- Libur nasional: CRUD.
- Pengaturan aplikasi: retensi foto, dll.
- Import karyawan dari CSV (validasi per baris, laporan baris gagal) agar onboarding 100 karyawan cepat.
- Audit log otomatis untuk semua perubahan master data dan perubahan peran.

TEST (Vitest + Supertest + Testcontainers MariaDB): unit test untuk aturan otorisasi dan lockout; integrasi test untuk login, refresh (termasuk pemakaian ulang token), logout, reset password, CSRF, dan akses lintas peran (pastikan karyawan tidak bisa melihat data orang lain).
Dokumentasikan endpoint di OpenAPI dengan contoh request/response.
```

---

## Prompt 3 — Modul absensi (backend)

```
Kerjakan TAHAP 3: modul absensi di backend.

ENDPOINT
- GET /api/v1/attendance/today: status hari ini (jam masuk, jam keluar, status, lokasi kerja, tombol yang boleh tampil: CheckIn atau CheckOut atau none).
- POST /api/v1/attendance/check-in dan /check-out (multipart/form-data): photo (JPEG), latitude, longitude, accuracy_meters, work_mode [Office|Home|Anywhere], client_captured_at. Wajib header Idempotency-Key agar retry karena koneksi buruk tidak membuat data ganda; request yang diulang mengembalikan hasil yang sama.
- GET /api/v1/attendance/history?month=YYYY-MM&status=: daftar dikelompokkan per tanggal plus ringkasan bulanan (hadir, terlambat, tidak hadir, belum absen keluar).
- GET /api/v1/attendance/:id: detail lengkap; foto disajikan lewat endpoint terotorisasi (bukan URL publik), dengan header cache private.

ATURAN BISNIS
- Waktu resmi selalu waktu server. client_captured_at hanya disimpan sebagai data pembanding; jika selisih dengan waktu server lebih dari 2 menit, tambahkan flag "jam_perangkat_tidak_sinkron". work_date dihitung dari waktu server dalam zona Asia/Jakarta (pakai luxon), bukan dari UTC.
- Satu check-in dan satu check-out per hari kerja. Check-out hanya setelah check-in. Duplikat mengembalikan 409 dengan data absensi yang sudah ada. Andalkan constraint unik di MariaDB untuk mencegah balapan (race condition) dan tangani error duplicate key dengan benar.
- Absen di hari libur nasional atau akhir pekan tetap diizinkan tetapi diberi flag "hari_non_kerja".
- Mode Office: wajib berada dalam radius lokasi kerja (rumus Haversine). Di luar radius: tolak dengan pesan jelas berisi jarak, misalnya "Anda berjarak 340 m dari area Kantor Pusat." Mode Home/Anywhere: tidak ada batas radius, lokasi tetap dicatat, dan dicek terhadap work_arrangement karyawan: karyawan ber-arrangement Office yang absen dengan mode Home/Anywhere diberi flag "mode_kerja_tidak_sesuai" untuk ditinjau HR (tidak ditolak).
- Akurasi GPS di atas 100 m ditolak dengan pesan agar coba lagi; 50-100 m diterima dengan flag "akurasi_rendah".
- Status check-in: Tepat Waktu atau Terlambat (simpan selisih menit). Status check-out: Normal atau Pulang Cepat (simpan selisih menit).
- Cuti yang disetujui pada tanggal tersebut: absen tetap diizinkan tetapi diberi flag "sedang_cuti".
- Job harian dengan node-cron (malam hari, zona Asia/Jakarta), dilindungi kunci GET_LOCK MariaDB agar tidak berjalan ganda: tandai "Belum Absen Keluar" bagi yang check-in tanpa check-out, dan bentuk rekap "Tidak Hadir" untuk hari kerja tanpa absensi, tanpa cuti, dan bukan libur.

FOTO
- Terima lewat multer memory storage dengan batas 1 MB. Validasi tipe dari isi file (file-type), JPEG saja. Proses dengan sharp: putar sesuai EXIF, buang seluruh metadata, batasi sisi terpanjang 1280 px, kualitas sekitar 75, target 150-250 KB. Simpan lewat FileStorage dengan path tidak dapat ditebak. Foto dapat diakses karyawan itu sendiri, atasannya, dan HR/Admin.
- Job pembersihan foto sesuai pengaturan retensi (default 12 bulan, nonaktif sampai HR mengaktifkan).

KEAMANAN DAN KETERBATASAN
- Catat di docs/DECISIONS.md bahwa PWA tidak bisa mendeteksi mock location secara andal; mitigasinya adalah foto kamera langsung, waktu server, akurasi GPS, dan flag untuk tinjauan HR.
- Semua penolakan absensi juga dicatat (tabel atau log terstruktur) untuk investigasi.

TEST: unit test untuk Haversine, penentuan status, konversi zona waktu, dan aturan mode kerja; integrasi test untuk seluruh skenario di atas termasuk idempotency, duplikat paralel, di luar radius, akurasi buruk, dan file bukan JPEG.
```

---

## Prompt 4 — Cuti, pengajuan keuangan, dan approval (backend)

```
Kerjakan TAHAP 4: modul pengajuan dan approval di backend.

ENGINE APPROVAL (generik, dipakai cuti dan keuangan)
- Tabel approval_steps menyimpan langkah berurutan. Hanya langkah Pending pertama yang aktif. Tolak di langkah mana pun mengakhiri pengajuan dengan status Ditolak dan catatan alasan WAJIB. Setujui langkah terakhir mengubah status menjadi Disetujui.
- Penentuan approver: Atasan = manager_id pemohon. Jika pemohon adalah atasan, gunakan atasan dari atasan; jika tidak ada, alihkan ke HR/Admin. Pemohon tidak boleh menyetujui pengajuannya sendiri (tolak di level domain). Bila approver nonaktif atau tidak ada, HR/Admin bisa menugaskan ulang approver dengan audit log.
- Hanya approver yang ditugaskan (atau HR/Admin sebagai pengganti tercatat) yang bisa bertindak. Semua tindakan tercatat: siapa, kapan, catatan.
- Semua perubahan status dan saldo dilakukan dalam satu transaksi Prisma. Cegah keputusan ganda dengan compare-and-set (UPDATE ... WHERE id = ? AND status = 'Pending' dan periksa jumlah baris terpengaruh). Pengurangan/pengembalian saldo cuti memakai kunci baris (SELECT ... FOR UPDATE lewat raw query) atau update atomik agar aman saat request bersamaan.
- Tidak ada bulk approval.

CUTI
- Endpoint: buat, daftar (aktif/riwayat, filter), detail, batalkan.
- Perhitungan jumlah hari kerja otomatis di server (kecualikan akhir pekan dan libur nasional); tampilkan preview lewat endpoint kalkulasi.
- Validasi: saldo cukup, tanggal tidak boleh bertabrakan dengan cuti aktif lain, lampiran wajib jika jenis cuti mengharuskan, tanggal mulai tidak boleh di masa lalu lebih dari batas yang dikonfigurasi (default 7 hari untuk cuti sakit, 0 untuk lainnya).
- Alur: Diajukan -> Atasan -> HR (langkah HR hanya jika jenis cuti requires_hr_approval).
- Saldo berkurang saat status akhir Disetujui; dikembalikan jika pembatalan dilakukan setelah disetujui dan sebelum tanggal mulai (pemohon hanya bisa membatalkan saat masih Diajukan; HR/Admin bisa membatalkan untuk kasus setelah disetujui).
- Cuti disetujui otomatis muncul di rekap absensi dan mencegah status "Tidak Hadir".

PENGAJUAN KEUANGAN
- Jenis: Reimbursement dan Pembelian (contoh: langganan software seperti Claude Pro). Kategori: Perjalanan Dinas, Software/Langganan, Perlengkapan Kerja, Lainnya.
- Field: jenis, kategori, nominal (Rupiah, > 0, batas maksimum konfigurasi; hitung dengan tipe desimal/integer, jangan float), keterangan (min 10 karakter), lampiran. Reimbursement wajib bukti (struk/nota); Pembelian wajib minimal satu lampiran (penawaran; tautan disimpan di keterangan bila tidak ada file).
- Alur: Diajukan -> Atasan -> Keuangan. Keuangan hanya melihat pengajuan yang sudah disetujui atasan.
- Endpoint ringkasan untuk Keuangan: total menunggu, disetujui bulan ini, ditolak.

LAMPIRAN
- JPG/PNG/PDF, maksimal 5 MB per file, maksimal 5 file, validasi isi file (file-type), simpan lewat FileStorage, unduh lewat endpoint terotorisasi dengan Content-Disposition dan X-Content-Type-Options: nosniff.

NOTIFIKASI
- Buat notifikasi in-app untuk: pengajuan baru bagi approver, keputusan bagi pemohon, penugasan ulang. Endpoint daftar, tandai dibaca, dan jumlah belum dibaca. (Web push tidak dikerjakan sekarang.)

ENDPOINT APPROVER
- Antrian "perlu diproses" per approver dengan filter tipe, status, anggota, dan rentang tanggal; detail lengkap dalam satu response (data pengajuan, lampiran, timeline approval, saldo cuti pemohon, ringkasan absensi bulan ini untuk cuti).

TEST: unit test untuk engine approval dan perhitungan hari kerja; integrasi test untuk alur penuh cuti dan keuangan, penolakan tanpa alasan, self-approval, pembatalan, saldo, approval ganda paralel, dan akses lintas peran.
```

---

## Prompt 5 — Frontend: design system, PWA, dan autentikasi

```
Baca docs/UI-SPEC.md. Dokumen itu adalah spesifikasi desain resmi. Kerjakan TAHAP 5: fondasi frontend (apps/web, Next.js + TypeScript). Perubahan terhadap spesifikasi:
- Ganti "Kasbon" menjadi "Pembelian" di seluruh UI (jenis pengajuan keuangan hanya Reimbursement dan Pembelian).
- Alur absen ditambah pemilihan "Kerja dari": Kantor, Rumah, atau Lokasi Lain. Radius kantor hanya berlaku untuk pilihan Kantor. Pilihan default mengikuti work_arrangement karyawan.
- Ini aplikasi sungguhan yang terhubung ke API Express, bukan prototype statis. Kerjakan integrasi API asli dengan TanStack Query, memakai skema Zod dan tipe dari packages/shared.
- Fase 1 tanpa fitur payroll, slip gaji, pajak, BPJS, lembur, fingerprint, atau shift di navigasi.

YANG DIKERJAKAN
1. Design system sebagai komponen React yang dapat dipakai ulang: token warna semantik (netral terang, emerald untuk sukses/hadir, biru tua untuk aksi utama, amber untuk peringatan, merah hanya error/penolakan; tanpa ungu), tipografi Plus Jakarta Sans lewat next/font, spacing, radius maksimal 8px, border tipis, bayangan sangat lembut, ikon Lucide. Komponen: Button, Input, Select, DatePicker, SearchField, SegmentedControl, Tabs, Badge status (teks selalu terbaca, warna hanya pendukung), Table (berubah menjadi daftar terstruktur di mobile), Dialog konfirmasi, Drawer/side panel, Toast, EmptyState, Skeleton, ErrorState, Timeline approval, FileUpload. Semua memenuhi ukuran sentuh minimal 44px, focus state jelas, navigasi keyboard, kontras WCAG AA, label ARIA. Buat halaman /dev/design-system untuk melihat seluruh komponen (hanya aktif di development).
2. Utilitas format Indonesia: tanggal (mis. "Selasa, 29 September 2026"), waktu 24 jam ("08.12 WIB"), Rupiah ("Rp 1.250.000"), durasi, jarak.
3. Layout: shell mobile dengan bottom navigation 4 menu (Beranda, Riwayat, Pengajuan, Profil) yang tidak menutupi konten (safe-area padding); shell desktop dengan sidebar ringkas untuk Atasan/Keuangan/HR. Navigasi menyesuaikan peran. Route guard berbasis peran.
4. Autentikasi: halaman login, lupa password, reset password, ganti password; client API dengan refresh token otomatis, pengiriman header anti-CSRF pada request yang mengubah data, dan penanganan 401/403; state loading, error, dan sesi berakhir.
5. PWA: manifest (nama CentroAbsen, ikon, theme color, mode standalone), service worker yang hanya men-cache app shell dan aset statis (mis. dengan Serwist). JANGAN meng-cache respons API, foto, atau data pribadi. Halaman offline sederhana yang menjelaskan bahwa absensi membutuhkan koneksi. Tombol/petunjuk "Pasang aplikasi". Pastikan skor Lighthouse PWA lolos.
6. Header keamanan di Next.js (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy yang mengizinkan camera dan geolocation hanya untuk origin sendiri).

Selesai bila: login sampai logout berfungsi untuk keempat peran dengan seed data, semua komponen tampil di halaman design system, dan lint, typecheck, serta test komponen lulus.
```

---

## Prompt 6 — Frontend karyawan: beranda, absen, riwayat, pengajuan

```
Kerjakan TAHAP 6: seluruh pengalaman karyawan (mobile-first 360-430 px, tetap rapi di tablet dan desktop). Ikuti docs/UI-SPEC.md beserta perubahan di Tahap 5. Gunakan API dari Tahap 3 dan 4.

BERANDA
Sapaan, foto profil kecil, ikon notifikasi dengan indikator, tanggal; jam server yang berjalan (sinkronkan dari /api/v1/time, jangan percaya jam perangkat); lokasi kerja dan status lokasi ("Di dalam area kerja - akurasi 12 m"); ringkasan jam masuk/keluar/status; SATU tombol utama besar (Absen Masuk atau Absen Keluar sesuai status server, tidak pernah dua tombol sekaligus); ringkasan sisa cuti, pengajuan aktif, kehadiran bulan ini; maksimal 3 aktivitas terbaru dengan tautan "Lihat semua".

ALUR ABSEN (langkah demi langkah, halaman penuh, bukan form panjang)
1. Pemeriksaan izin kamera dan lokasi.
2. Pilih "Kerja dari" (Kantor, Rumah, Lokasi Lain).
3. Kamera layar penuh memakai getUserMedia kamera depan; tanpa opsi galeri dan tanpa input file. Petunjuk "Pastikan wajah terlihat jelas".
4. Preview dengan "Foto Ulang" dan "Gunakan Foto".
5. Validasi lokasi, radius (untuk mode Kantor), akurasi GPS, dan koneksi.
6. Kirim dengan Idempotency-Key dan tampilkan konfirmasi: foto kecil, waktu server, lokasi, jarak dari titik kantor (untuk mode Kantor), status Tepat Waktu atau Terlambat n menit.
Implementasikan SEMUA state: meminta izin, izin ditolak dengan petunjuk mengaktifkan (Android/iOS), mengambil lokasi, akurasi buruk + "Coba Lagi", di luar radius dengan jarak jelas, mengirim, berhasil, gagal koneksi dengan aksi ulang (foto yang sudah diambil tetap tersimpan sementara di memori sampai berhasil, dengan Idempotency-Key yang sama saat mengulang), dan sudah absen hari ini. Hentikan stream kamera saat keluar halaman. Kompres/ubah ukuran foto di klien sebelum kirim. Jangan menyimpan foto ke penyimpanan permanen perangkat.

RIWAYAT
Ringkasan bulanan, pemilih bulan, filter status, daftar dikelompokkan per tanggal (jam masuk, jam keluar, durasi, lokasi, status). Detail: foto masuk/keluar, koordinat, peta Leaflet kecil, akurasi, waktu server, catatan status, dan flag yang relevan ditampilkan dengan bahasa yang ramah.

PENGAJUAN
Halaman dengan tab Aktif dan Riwayat, tombol "Buat Pengajuan" yang memilih Cuti atau Keuangan.
- Form Cuti: jenis, saldo tersedia, tanggal mulai/selesai, jumlah hari otomatis (dari endpoint kalkulasi), alasan, lampiran (wajib bila jenis mengharuskan), ringkasan sebelum kirim, timeline persetujuan.
- Form Keuangan: jenis (Reimbursement/Pembelian), kategori, nominal Rupiah dengan format otomatis, keterangan, lampiran bukti, ringkasan, timeline Diajukan -> Atasan -> Keuangan.
- Detail pengajuan: status, timeline, pemroses, waktu tindakan, alasan penolakan; tombol Batalkan hanya saat status Diajukan, dengan dialog konfirmasi.
Form panjang memakai halaman penuh atau drawer, bukan modal kecil. Validasi inline berbahasa Indonesia, cegah kirim ganda.

NOTIFIKASI dan PROFIL
Halaman notifikasi (belum dibaca/semua, tandai dibaca), profil (data diri, atasan, lokasi kerja, ganti password, keluar).

Tulis test Vitest untuk logika penting (state machine alur absen, format, validasi form) dan Playwright untuk: login -> absen masuk -> foto -> validasi lokasi -> berhasil (gunakan kamera dan geolocation palsu dari Playwright), serta pembuatan pengajuan cuti dan keuangan.
```

---

## Prompt 7 — Frontend Atasan, Keuangan, HR/Admin, dan laporan

```
Kerjakan TAHAP 7: dashboard untuk Atasan, Keuangan, dan HR/Admin. Desktop 1280-1440 px adalah prioritas, tetap dapat dipakai di tablet dan HP (tabel menjadi daftar terstruktur, tanpa scroll horizontal kecuali benar-benar perlu). Ikuti docs/UI-SPEC.md.

ATASAN
- Ringkasan tim hari ini: hadir, terlambat, tidak hadir, belum absen keluar (dengan daftar anggota).
- Antrian approval yang perlu diproses, filter tipe/status/anggota/tanggal.
- Detail approval dalam side panel atau layout dua kolom tanpa pindah halaman: data pengajuan, lampiran, timeline, saldo cuti dan ringkasan absensi pemohon.
- "Setujui" dan "Tolak" jelas namun tidak rawan salah tekan: dialog konfirmasi untuk keduanya; "Tolak" mewajibkan alasan. Approval satu per satu, tanpa bulk approval.

KEUANGAN
- Daftar pengajuan finansial yang sudah disetujui atasan: karyawan, jenis, kategori, nominal, tanggal, status.
- Detail dengan preview lampiran (gambar/PDF) dan riwayat persetujuan; setujui/tolak dengan konfirmasi dan catatan.
- Ringkasan: nominal menunggu, disetujui bulan ini, ditolak bulan ini.

HR/ADMIN (sidebar: Ringkasan, Absensi, Karyawan, Lokasi Kerja, Cuti, Laporan, Pengaturan)
- Ringkasan: statistik hari ini yang relevan, daftar keterlambatan, belum absen keluar, pengajuan menunggu, tren kehadiran 7/30 hari, dan daftar absensi berflag yang perlu ditinjau (mode_kerja_tidak_sesuai, akurasi_rendah, jam_perangkat_tidak_sinkron).
- Absensi: tabel harian dengan filter, detail foto dan peta.
- Karyawan: tabel dengan pencarian dan filter divisi/status/peran; kolom karyawan, NIK, divisi, atasan, lokasi kerja, peran, status; tambah/edit lewat side panel; nonaktifkan; import CSV dengan pratinjau dan laporan kesalahan per baris.
- Lokasi Kerja: daftar + peta; form titik lokasi (klik peta atau input koordinat) dan radius dengan preview lingkaran geofence; jam kerja dan jumlah karyawan.
- Cuti: pengaturan jenis cuti, kuota, wajib lampiran, wajib persetujuan HR; penyesuaian saldo dengan catatan; kelola libur nasional.
- Laporan: filter periode, karyawan, divisi, lokasi, status; tabel absensi harian/bulanan; tampilkan filter aktif dan jumlah hasil; tombol "Ekspor Excel" memanggil endpoint backend (exceljs, kolom berformat, header, ringkasan per karyawan, nama file berisi periode; gunakan streaming writer agar hemat memori). Tambahkan endpoint dan UI laporan pengajuan cuti dan keuangan juga.
- Pengaturan: jam kerja default, toleransi, retensi foto, penugasan ulang approver.

Backend: tambahkan endpoint yang belum ada untuk kebutuhan di atas (agregasi ringkasan, laporan, ekspor) lengkap dengan test dan pastikan query efisien (index, tanpa N+1, gunakan agregasi di database) untuk 100 karyawan x 12 bulan. Perhatikan sensitivitas collation dan zona waktu pada query tanggal di MariaDB.

Sertakan state loading (skeleton), kosong, dan error di setiap halaman. Test Playwright untuk: approval atasan (setujui dan tolak dengan alasan), approval keuangan, dan ekspor laporan HR (verifikasi file terunduh dan isinya).
```

---

## Prompt 8 — QA, keamanan, dan siap rilis

```
Kerjakan TAHAP 8: hardening dan kesiapan produksi. Jangan menambah fitur baru.

1. Audit menyeluruh terhadap docs/PRD.md dan docs/UI-SPEC.md: buat docs/QA-CHECKLIST.md berisi setiap kebutuhan, statusnya (lulus/gagal), dan bukti. Perbaiki semua yang gagal.
2. Keamanan: tinjau OWASP Top 10 terhadap kode; pastikan tidak ada IDOR (uji akses lintas peran dan lintas pengguna pada setiap endpoint), tidak ada SQL injection pada raw query (parameterisasi), validasi upload, header keamanan, CSP tanpa unsafe-inline yang tidak perlu, rate limiting, CSRF, cookie flags, log tidak memuat data sensitif, dan dependensi tanpa kerentanan tinggi (jalankan pnpm audit). Tulis hasilnya di docs/SECURITY.md.
3. Aksesibilitas: jalankan axe pada halaman utama tiap peran; perbaiki pelanggaran serius dan kritis. Uji navigasi keyboard, kontras, ukuran sentuh 44px, dan layar 360 px.
4. Performa dan PWA: Lighthouse mobile untuk Beranda dan alur absen (target Performance >= 85, PWA lolos), pastikan absen selesai kurang dari 5 detik pada jaringan 4G simulasi, dan foto yang terkirim berukuran 150-250 KB. Tinjau rencana query MariaDB (EXPLAIN) untuk endpoint laporan dan dashboard.
5. Pengujian: jalankan seluruh test backend, frontend, dan e2e; tambahkan e2e untuk skenario gagal (izin kamera ditolak, di luar radius, koneksi putus lalu ulang, absen ganda). Laporkan cakupan test.
6. Deployment: buat docker compose produksi (reverse proxy dengan HTTPS, env terpisah, build multi-stage, proses Node berjalan sebagai user non-root, volume untuk database dan file), migrasi database dijalankan lewat prisma migrate deploy, skrip backup harian MariaDB (mariadb-dump atau mariabackup) dan folder foto beserta prosedur restore yang sudah diuji, healthcheck, dan konfigurasi log. Dokumentasikan di docs/DEPLOYMENT.md, termasuk perkiraan kebutuhan penyimpanan (sekitar 100 karyawan x 2 foto/hari x 200 KB).
7. Dokumentasi: README final, panduan pengguna singkat per peran (Karyawan, Atasan, Keuangan, HR/Admin) dalam Bahasa Indonesia di docs/USER-GUIDE.md, dan daftar keputusan di docs/DECISIONS.md.
8. Bersihkan: hapus kode mati, pastikan seed hanya berjalan di development, dan pastikan tidak ada secret di repo.

Akhiri dengan laporan rilis: daftar fitur selesai, batasan yang diketahui (termasuk soal mock location di PWA), dan saran fase berikutnya (payroll, shift, lembur, web push).
```
