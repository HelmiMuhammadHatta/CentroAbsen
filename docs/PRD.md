# Product Requirements Document (PRD) - CentroAbsen

**Versi Dokumen:** 1.0.0  
**Tanggal:** 29 September 2026  
**Status:** Dokumen Spesifikasi Utama & Analisis Sistem  

---

## 1. IKHTISAR PRODUK (PRODUCT OVERVIEW)

### 1.1 Deskripsi Produks
**CentroAbsen** adalah Sistem Informasi Manajemen Kehadiran, Cuti, Keuangan, dan Struktur Organisasi berbasis web monorepo yang dirancang khusus untuk memenuhi kebutuhan operasional perusahaan berkembang (skala ~100 karyawan). Sistem ini memprioritaskan validasi kehadiran yang akurat, alur persetujuan (approval) berjenjang yang transparan, serta antarmuka pengguna yang modern, responsif, dan intuitif.

### 1.2 Skala & Parameter Operasional
- **Jumlah Pengguna Target**: ~100 Karyawan.
- **Zona Waktu**: WIB (Asia/Jakarta, UTC+7). Semua data timestamp disimpan dalam UTC di database MariaDB (`DATETIME(3)`) dan dikonversi ke WIB pada tampilan UI.
- **Jam Kerja Standard**: 08.00 - 17.00 WIB (dapat dikonfigurasi per lokasi kerja), toleransi keterlambatan default 0 menit.
- **Skema Kerja (Work Arrangement)**: 
  - `Office` (WFO - Work From Office)
  - `Hybrid` (Kombinasi WFO/WFH)
  - `Flexible` (Jam/Lokasi Fleksibel)
  - `Remote` (WFH - Work From Home / WFA - Work From Anywhere)

---

## 2. ARSITEKTUR & STACK TEKNOLOGI

### 2.1 Arsitektur Monorepo
CentroAbsen dibangun menggunakan **pnpm workspaces** dengan struktur monorepo:
```
CentroAbsen/
├── apps/
│   ├── api/          # Backend Express.js v5 REST API
│   └── web/          # Frontend Next.js / React + Vite Single Page Application
├── packages/
│   └── shared/       # TypeScript types, Zod schemas, Enum, dan Shared Constants
├── docs/             # PRD, Architecture, Decisions, & Security Docs
└── docker-compose.yml
```

### 2.2 Backend Stack (`apps/api`)
- **Runtime & Framework**: Express.js v5 (Node.js LTS, ESM/TypeScript strict mode).
- **ORM & Database**: Prisma ORM v6, MariaDB 11.4 LTS (Engine InnoDB, Charset `utf8mb4_unicode_ci`).
- **Primary Key & Identitas**: UUID v7 (CHAR(36)) yang dibuat secara aplikatif.
- **Autentikasi & Kemanan**: Argon2 (Password Hashing), JWT (Access Token & Refresh Token dalam HttpOnly Cookie / Bearer Header), Helmet (Security Headers & Cross-Origin Resource Policy), CORS.
- **Pengolahan Media & Upload**: Multer (Memory Storage), Sharp (Image Resizing & Compression to JPEG 1280px max, quality 75%), File-Type (Magic byte validation).
- **Validasi Data**: Zod Schema validation di trust boundaries.
- **Logging & Monitoring**: Pino / Pino-HTTP dengan structured JSON logging.
- **Penyimpanan File Static**: Abstraksi `express.static('/uploads')` melayani foto presensi secara publik/terproteksi.

### 2.3 Frontend Stack (`apps/web`)
- **Framework & UI**: React 18, Vite, TypeScript, Tailwind CSS, Plus Jakarta Sans typography.
- **State & Data Fetching**: TanStack React Query v5 (Caching, Automatic Refetching, Optimistic Updates), Zustand (Client Auth Store).
- **Komponen & Ikon**: Lucide React Icons, Sonner (Modern Toast Notifications).
- **Validasi Form**: React Hook Form + Zod resolver.
- **Peta & Geolokasi**: Leaflet.js / OpenStreetMap & Browser HTML5 Geolocation API (`navigator.geolocation`).

---

## 3. SPESIFIKASI DETAIL MODUL TERBALIK & FITUR REALISASI

---

### 3.1 MODUL 1: PRESENSI & KEHADIRAN (ATTENDANCE)

#### A. Alur Kerja Presensi Masuk & Keluar (Clock In / Clock Out)
1. **Pengambilan Foto Wajah**:
   - Pengguna mengaktifkan kamera depan (Webcam / Mobile Camera).
   - Foto ditangkap dalam format Base64/Blob, dikirim melalui FormData multipart, lalu dikompres oleh backend menggunakan Sharp (maksimal 1280px JPEG, kualitas 75%).
2. **Pengambilan Lokasi GPS & Geocoding**:
   - Browser mengambil koordinat Latitude, Longitude, dan Akurasi (Meter) dari `navigator.geolocation`.
   - Nama lokasi dibaca menggunakan reverse geocoding OpenStreetMap Nominatim API (`city`/`town`/`village`).
3. **Pilihan Mode Presensi (Work Mode)**:
   - `Office` (WFO): Memerlukan verifikasi jarak radius dari Lokasi Kerja Utama.
   - `Home` (WFH): Presensi dari rumah, melewati verifikasi jarak radius kantor.
   - `Anywhere` (Remote / Tugas Luar): Presensi saat tugas lapangan atau remote.
   - **Otomatisasi Mode**: Jika karyawan telah melakukan Clock In pada hari tersebut dengan mode tertentu (misal: `WFH`), mode pada action Clock Out secara otomatis tersinkronisasi ke mode yang sama.
4. **Validasi & Proteksi Anti-Fraud Backend**:
   - **Sinkronisasi Waktu Server**: Membandingkan `clientCapturedAt` dengan `serverTime` (Luxon Asia/Jakarta). Jika selisih > 2 menit, ditandai flag `jam_perangkat_tidak_sinkron`.
   - **Batas Jarak Radius Kantor (WFO)**: Untuk mode `Office`, backend menghitung jarak posisi karyawan terhadap koordinat `primary_work_location` menggunakan rumus **Haversine Formula**. Jika jarak > `radius_meters` (misal 150m), request ditolak dengan pesan: `"Anda berjarak X m dari area [Lokasi]. (Batas: 150 m)"`.
   - **Validasi Akurasi GPS**: Jika akurasi GPS > 100m pada mode produksi, request ditolak. Pada mode pengembangan, ditandai flag `akurasi_rendah`.
   - **Proteksi Idempotensi**: Header `Idempotency-Key` wajib ada untuk mencegah submit ganda akibat masalah jaringan.
   - **Pencegahan Double Clock In**: Karyawan yang sudah melakukan Check-In pada hari kerja yang sama tidak dapat Check-In kembali sebelum melakukan Check-Out.

#### B. Rekap & Riwayat Kehadiran (Attendance History & Consolidation)
- **Konsolidasi Log Harian (1 Baris per Hari)**: backend mengelompokkan (grouping) record `CheckIn` dan `CheckOut` milik karyawan di hari yang sama menjadi 1 baris log terpadu.
- **Tampilan Tabel**:
  - Kolom **Employee**: Nama Karyawan.
  - Kolom **Date**: Tanggal Presensi (DD/MM/YYYY).
  - Kolom **Location**: Nama Lokasi Kantor atau status `WFH (Rumah)` / `Tugas Luar / Remote`.
  - Kolom **Photo**: Thumbnail foto presensi yang dilayani dari endpoint backend `/uploads/...`.
  - Kolom **Clock In & Clock Out**: Jam presensi masuk (hijau) dan keluar (oranye).
  - Kolom **Status Badge**: `Tepat Waktu` (On Time), `Terlambat` (Late), `Pulang Cepat` (Early Leave).

---

### 3.2 MODUL 2: PENGAJUAN CUTI (LEAVE REQUEST MANAGEMENT)

#### A. Jenis & Aturan Cuti (Leave Types & Policies)
1. **Cuti Tahunan (Annual Leave)**: Mengurangi kuota tahunan karyawan (default 12 hari/tahun).
2. **Cuti Sakit (Sick Leave)**: Memerlukan lampiran surat keterangan dokter.
3. **Cuti Melahirkan / Parental Leave**: Cuti khusus sesuai kebijakan gender/undang-undang.
4. **Izin Khusus / Unpaid Leave**: Izin keperluan mendesak/tanpa gaji.

#### B. Sisa Cuti & Kuota (Leave Balances)
- Setiap karyawan memiliki record `LeaveBalance` per tahun yang mencatat: `total_allowance`, `used_days`, `pending_days`, `remaining_days`.
- Pengajuan cuti baru secara otomatis mengecek apakah `remaining_days >= requested_days`.

#### C. Alur Persetujuan Cuti (Leave Approval Workflow)
1. Karyawan mengajukan cuti dengan tanggal mulai, tanggal selesai, jenis cuti, dan alasan.
2. Hari libur akhir pekan (Sabtu/Minggu) dan hari libur nasional (`Holiday` table) otomatis dikecualikan dari perhitungan jumlah hari cuti.
3. Status awal pengajuan: `Pending`.
4. **Approval Atasan Direct Manager**: Atasan langsung (`manager_id`) atau HR/Admin dapat melihat daftar pengajuan timnya dan melakukan **Approve** atau **Reject** disertai catatan alasan.
5. Setelah disetujui (`Approved`), kuota `used_days` bertambah dan `remaining_days` berkurang secara otomatis.

---

### 3.3 MODUL 3: STRUKTUR PERUSAHAAN (COMPANY STRUCTURE & HIERARCHY)

#### A. Komponen Struktur Organisasi
1. **Departemen (Department)**: Pengelompokan divisi (misal: *Product & Engineering*, *Human Resources*, *Finance*, *Marketing*).
2. **Jabatan (Position)**: Peran/level pekerjaan (misal: *Software Engineer*, *HR Manager*, *Finance Executive*).
3. **Lokasi Kerja Utama (Primary Work Location)**: Kantor fisik atau cabang (misal: *Headquarters Jakarta*, *Bandung Hub*), yang memiliki koordinat Latitude, Longitude, Radius (Meter), serta Jam Masuk/Keluar kantor.

#### B. Hierarki Manajer & Subordinat (Manager-Subordinate Mapping)
- Setiap karyawan (`User`) memiliki relasi rekursif `manager_id` yang menunjuk ke karyawan lain sebagai atasan langsungnya.
- **Validasi Anti-Circular Reference**: backend memiliki mekanisme pengujian rekursif `checkCircularReference(userId, newManagerId)` sebelum perubahan hierarki disimpan.
- Jika terdapat hubungan melingkar (misal: *Karyawan A membawahi Karyawan B, dan Karyawan B ditunjuk menjadi manajer Karyawan A*), backend menolak update dengan pesan: `"Validasi Gagal: Circular reference terdeteksi pada hierarki manajer"`.

---

### 3.4 MODUL 4: PENGAJUAN KEUANGAN (FINANCE REQUESTS / REIMBURSEMENT)

#### A. Jenis Pengajuan Keuangan (Finance Request Kinds)
1. **Reimbursement (Klaim Biaya)**: Penggantian biaya yang telah dikeluarkan karyawan untuk kepentingan operasional perusahaan (misal: bensin/transportasi dinas, makan siang meeting client, langganan software/tool seperti Claude Pro atau OpenAI API).
2. **Cash Advance (Uang Muka Kerja)**: Pengajuan dana di awal sebelum kegiatan operasional dilaksanakan.

#### B. Alur Pengajuan & Bukti Struk (Receipt & Approval Workflow)
1. Karyawan mengisi formulir pengajuan keuangan: Jenis Klaim, Nominal (IDR), Tanggal Transaksi, Deskripsi Keperluan, dan Mengunggah Foto Bukti Struk/Nota (`receipt_photo_path`).
2. Status pengajuan diawali dari `Pending`.
3. **Verifikasi & Approval Berjenjang**:
   - Tahap 1: Persetujuan Atasan Langsung (`Manager`).
   - Tahap 2: Verifikasi & Pembayaran oleh Tim Keuangan (`Finance` / `Admin`).
4. Pencatatan status transparan: `Pending` -> `Approved` -> `Paid` (Lunas) atau `Rejected` (Ditolak dengan alasan).

---

### 3.5 MODUL 5: REKRUTMEN & CANDIDATE TRACKING (RECRUITMENT & ONLINE TEST)

#### A. Pengelolaan Lowongan Pekerjaan (Job Openings)
- HR/Admin dapat membuat, memperbarui, dan menutup lowongan kerja publik.
- Detail lowongan memuat: Judul Posisi, Departemen, Deskripsi Pekerjaan, Persyaratan, dan Status Aktif.

#### B. Aplikasi Kandidat & Asesmen Tes Online
1. Kandidat melamar pekerjaan melalui portal karir publik (`/careers`).
2. HR memberikan sesi tes online (`TakeTest`) dengan kode akses unik.
3. Kandidat mengerjakan soal pilihan ganda secara daring dengan batas waktu (timer). Hasil tes langsung dihitung otomatis.
4. **Konversi Kandidat ke Karyawan Baru**: Kandidat yang lolos seleksi dapat dikonversi oleh HR menjadi Karyawan resmi (`User`), secara otomatis dibuatkan NIK, akun login, dan dikirimkan kredensial awal.

---

## 4. ANALISIS KEKURANGAN, CELAH (GAPS), & KETERBATASAN SISTEM

Meskipun CentroAbsen telah berhasil mengimplementasikan seluruh modul utama di atas, terdapat beberapa celah arsitektural dan keterbatasan yang perlu diperhatikan:

### 4.1 Keterbatasan Geolokasi pada Hardware PC / Desktop
- **Akurasi Wi-Fi IP Geolocation**: Browser yang dijalankan di laptop/desktop tanpa chip GPS fisik memanfaatkan triangulasi IP/Wi-Fi yang menghasilkan radius akurasi tinggi (50m - 500m).
- **Mitigasi Terpasang**: Pada environment `development`, akurasi > 100m diizinkan dan ditandai sebagai `akurasi_rendah`. Pada environment `production`, karyawan dianjurkan menggunakan smartphone saat presensi WFO.

### 4.2 Ketiadaan Fitur Phase 2 (Sesuai Batasan Scope PRD)
Sesuai batasan PRD Fase 1, fitur-fitur berikut **secara sengaja tidak dibuat** dan dilarang muncul di navigasi UI:
1. **Perhitungan Payroll & Slip Gaji**: Belum ada modul otomatisasi kalkulasi gaji bersih, BPJS Kesehatan/Ketenagakerjaan, dan PPh 21.
2. **Integrasi Mesin Fingerprint / Biometrik Hardware**: Belum ada konektor SDK perangkat keras absensi sidik jari (hanya menggunakan kamera web/mobile).
3. **Lembur Otomatis (Overtime Calculation)**: Belum ada formula perhitungan SPL (Surat Perintah Lembur) dan kompensasi jam lembur.
4. **Shift Kerja Kompleks**: Jam kerja masih menggunakan pola standar lokasi kerja.

### 4.3 Keamanan Auth & Session Storage
- **Refresh Token Storage**: Penggunaan Refresh Token berbasis database MariaDB sudah diimplementasikan, namun disarankan untuk produksi memasang proteksi **IP Pinning** dan **CSRF SameSite Strict Cookie**.
- **Rate Limiting Endpoint Presensi**: Diperlukan penguatan `express-rate-limit` khusus pada endpoint `/api/v1/attendances/submit` (maksimal 5 request per menit per IP) untuk mencegah serang DDoS atau spamming foto.

### 4.4 Skalabilitas & Query Performance
- **Grouping Log Absensi di Memory**: Pengelompokan Check-In & Check-Out di `AttendanceController.list` saat ini dilakukan di memori Node.js (`groupedMap`). Untuk data berskala jutaan row di masa depan, sebaiknya dipindahkan ke SQL Query (`GROUP BY user_id, work_date`) atau View MariaDB.

---

## 5. MATRIKS PERAN & HAK AKSES (RBAC MATRIX)

| Modul / Fitur | Karyawan (Employee) | Atasan (Manager) | Keuangan (Finance) | HR / Super Admin |
| :--- | :---: | :---: | :---: | :---: |
| **Clock In / Clock Out** | ✅ | ✅ | ✅ | ✅ |
| **Lihat Riwayat Presensi Sendiri** | ✅ | ✅ | ✅ | ✅ |
| **Lihat Riwayat Presensi Tim/Semua** | ❌ | ✅ (Tim) | ❌ | ✅ (Semua) |
| **Pengajuan Cuti** | ✅ | ✅ | ✅ | ✅ |
| **Approve / Reject Cuti** | ❌ | ✅ (Subordinat) | ❌ | ✅ (Semua) |
| **Pengajuan Keuangan (Reimburse)** | ✅ | ✅ | ✅ | ✅ |
| **Approve & Bayar Keuangan** | ❌ | ✅ (Review) | ✅ (Eksekusi Bayar) | ✅ |
| **Kelola Struktur & Karyawan** | ❌ | ❌ | ❌ | ✅ |
| **Kelola Rekrutmen & Tes** | ❌ | ❌ | ❌ | ✅ |

---

## 6. KESIMPULAN & REKOMENDASI PENGEMBANGAN

CentroAbsen Fase 1 telah menyelesaikan seluruh pondasi utama manajemen SDM perusahaan meliputi **Presensi Geofencing & Foto**, **Manajemen Cuti**, **Struktur Organisasi Anti-Circular**, **Pengajuan Keuangan**, serta **Portal Rekrutmen**. Sistem ini siap digunakan untuk operasional skala 100 karyawan dengan performa yang stabil dan tampilan antarmuka yang modern.
