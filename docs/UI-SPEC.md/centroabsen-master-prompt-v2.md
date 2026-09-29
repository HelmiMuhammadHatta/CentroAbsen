# CentroAbsen — Master Prompt Lengkap (v2)

Dokumen ini menggabungkan **seluruh prompt lanjutan** dalam satu urutan final. Disusun setelah membaca PRD as-built CentroAbsen v1.0.0 (29 September 2026) yang dihasilkan Antigravity, EMS-Portal sebagai referensi model, serta tambahan aturan otorisasi: **hanya Super Admin dan HRD yang dapat mengakses semuanya**.

Dokumen ini menggantikan: `centroabsen-prompt-lanjutan.md`, `centroabsen-prompt-9b-revisi-hris.md`, dan `centroabsen-prompt-ems-alignment.md`.

---

## 1. Kesimpulan kekurangan PRD v1.0.0

PRD as-built sudah menjelaskan modul presensi, cuti, struktur organisasi, dan pengajuan keuangan dengan cukup baik. Kekurangannya ada di lima kelompok.

### A. Celah keamanan dan privasi (paling mendesak)

| Temuan di PRD | Masalah | Ditangani di |
|---|---|---|
| Foto presensi dilayani lewat `express.static('/uploads')`, "publik/terproteksi" | Foto wajah karyawan bisa diakses lewat URL tanpa otorisasi bila tidak benar-benar diproteksi. Spesifikasi kita mewajibkan endpoint terotorisasi | Tahap 2 |
| Reverse geocoding memanggil Nominatim publik dari browser | Koordinat karyawan bocor ke pihak ketiga, ada batas pemakaian (sekitar 1 request/detik), dan bisa gagal saat jam sibuk | Tahap 2 |
| Rate limit "5 request/menit per IP" | Kantor dengan 100 karyawan biasanya berbagi satu IP. Saat jam masuk, seluruh kantor bisa terblokir. Kuncinya harus per pengguna | Tahap 2 |
| JWT di "HttpOnly Cookie / Bearer Header", Zustand sebagai auth store | Mode Bearer berarti token bisa tersimpan di JavaScript (localStorage/memori) yang rentan XSS | Tahap 2 |
| CSRF hanya "disarankan", bukan diimplementasikan | Spesifikasi kita mewajibkan proteksi CSRF | Tahap 2 |
| Saran "IP Pinning" untuk refresh token | Karyawan berpindah antara Wi-Fi dan data seluler, IP berubah, sehingga pengguna sah sering ter-logout. Lebih baik rotasi token dengan deteksi pemakaian ulang plus daftar sesi | Tahap 2 |
| Foto wajah dan lokasi tanpa pemberitahuan privasi dan retensi | Foto wajah termasuk data pribadi yang sensitif. Perlu pemberitahuan/persetujuan dan kebijakan retensi (konsultasikan dengan pihak hukum untuk UU PDP) | Tahap 2 |

### B. Menyimpang dari spesifikasi yang sudah kita sepakati

| PRD as-built | Spesifikasi kita | Ditangani di |
|---|---|---|
| Approval keuangan: Atasan lalu Keuangan | Karyawan -> Atasan -> **CEO** -> Keuangan (pencairan) | Tahap 6 |
| Jenis pengajuan: Reimbursement dan **Cash Advance** | Reimbursement dan **Pembelian** (tanpa kasbon) | Tahap 6 |
| Status Pending/Approved/Paid/Rejected, tanpa data pencairan | Status per langkah, plus tanggal, metode, nomor referensi, bukti pencairan | Tahap 6 |
| RBAC berupa matriks 4 peran tetap, HR dan Super Admin digabung, tanpa CEO | RBAC berbasis permission (model EMS-Portal), Super Admin dan HRD dipisah dengan akses penuh, plus peran CEO | Tahap 5 |
| Frontend tertulis "Next.js / React + Vite" | Harus satu, sesuai kode nyata | Tahap 1 dan 10 |
| Tidak ada PWA (manifest, service worker) | Aplikasi PWA | Tahap 8 |
| Approval terpisah per modul | Satu aplikasi, satu login, kotak masuk persetujuan terpadu | Tahap 8 |

### C. Fitur dan dokumentasi yang belum ada di PRD

- Modul **autentikasi** tidak dijelaskan (login, lupa password, lockout, wajib ganti password pertama, sesi aktif).
- **Notifikasi** in-app dan kotak masuk persetujuan.
- **Laporan dan ekspor Excel**, dashboard analitik.
- **Audit trail** dan **dokumen karyawan** (dari model EMS-Portal), manajemen role/permission.
- Rekap "Tidak Hadir" dan "Belum Absen Keluar" (job harian), tinjauan flag oleh HRD, retensi foto.
- Cuti: pembatalan, validasi tumpang tindih, langkah HR bersyarat, pengelolaan libur dan jenis cuti.
- Pengelompokan riwayat absensi masih di memori Node.js; perlu dipindah ke query SQL.
- Tidak ada model data/ERD, ringkasan API, persyaratan non-fungsional (performa, backup, retensi), kriteria penerimaan, dan dokumentasi Swagger.
- Kesimpulan PRD ("siap digunakan, performa stabil") **belum berbasis bukti**. Belum ada laporan test yang benar-benar dijalankan.

### D. Di luar scope tetapi ada di PRD

**Modul Rekrutmen** (portal karier publik `/careers`, tes online dengan kode akses, konversi kandidat menjadi karyawan yang membuat akun dan mengirim kredensial) tidak pernah diminta. Modul ini membuka endpoint publik tanpa login, menyimpan data pribadi kandidat, dan otomatis membuat akun. Default di Tahap 3: **dinonaktifkan lewat feature flag**, tanpa menghapus kode.

---

## 2. Rancangan otorisasi baru

**Peran:** Super Admin, HRD, CEO (Executive), Atasan (Manager), Keuangan (Finance), Karyawan (Employee).

| Fitur | Karyawan | Atasan | Keuangan | CEO | HRD | Super Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Absen, riwayat sendiri, pengajuan sendiri | Ya | Ya | Ya | Ya | Ya | Ya |
| Lihat presensi/cuti tim | Tidak | Bawahan langsung | Tidak | Tidak | Semua | Semua |
| Approve cuti | Tidak | Bawahan langsung | Tidak | Tidak | Semua | Semua |
| Approve keuangan tahap Atasan | Tidak | Bawahan langsung | Tidak | Tidak | Semua | Semua |
| Approve keuangan tahap CEO | Tidak | Tidak | Tidak | Ya | Semua | Semua |
| Pencairan dana | Tidak | Tidak | Ya | Tidak | Semua | Semua |
| Kelola karyawan, struktur, lokasi, libur, jenis cuti, pengaturan | Tidak | Tidak | Tidak | Tidak | Ya | Ya |
| Dokumen karyawan, audit log, manajemen role/permission | Tidak | Tidak | Tidak | Tidak | Ya | Ya |
| Laporan dan ekspor | Tidak | Tim | Keuangan saja | Ringkasan keuangan | Semua | Semua |

Default yang dipakai (ubah bila tidak cocok):
1. **Super Admin dan HRD memiliki akses penuh setara**, otomatis termasuk permission baru di masa depan.
2. **Pemisahan tugas tetap berlaku untuk semua orang, termasuk Super Admin/HRD:** pemohon tidak boleh menyetujui atau mencairkan pengajuannya sendiri.
3. **Pengaman akun:** minimal satu Super Admin aktif, akun Super Admin pertama dibuat lewat skrip instalasi (tanpa kredensial default di production, wajib ganti password saat login pertama), dan semua tindakan Super Admin/HRD masuk audit log.
4. **Default-deny:** endpoint tanpa deklarasi permission ditolak.

---

## 3. Urutan eksekusi

| Tahap | Isi | Catatan |
|---|---|---|
| 1 | Verifikasi nyata dan audit kesenjangan | Nyalakan Docker Desktop dulu |
| 2 | Perbaikan keamanan dan privasi | Sebelum fitur baru |
| 3 | Nonaktifkan modul Rekrutmen | Singkat |
| 4 | Analisis proyek referensi EMS-Portal | Hanya membaca |
| 5 | RBAC berbasis permission dan otorisasi Super Admin/HRD | Berhenti menunggu konfirmasi tabel pemetaan |
| 6 | Alur approval keuangan: Atasan, CEO, Keuangan | Backend |
| 7 | Melengkapi backend yang kurang | Notifikasi, laporan, auth, cuti, absensi |
| 8 | Frontend HRIS satu aplikasi | Satu login, menu sesuai permission |
| 9 | Swagger/OpenAPI | Setelah backend stabil |
| 10 | PRD v2, QA, dan rilis | Dokumen berbasis bukti |

Jalankan berurutan, masing-masing di conversation/agent baru. Tunggu tiap tahap selesai dan periksa hasilnya sebelum lanjut.

---

## Blok aturan umum (tempel ke AGENTS.md)

```
ATURAN UMUM UNTUK SEMUA TAHAP
- Kerjakan di atas kode yang sudah ada. Jangan menulis ulang dari nol dan jangan menghapus data atau fitur yang berjalan tanpa alasan tertulis.
- Kerjakan hanya cakupan tahap yang diminta. Keputusan bisnis yang ambigu: pilih default paling aman, catat di docs/DECISIONS.md.
- Semua migrasi database harus aman untuk data yang sudah ada dan dapat dijalankan ulang.
- Semua teks UI, pesan error, dan status dalam Bahasa Indonesia; kode dan nama tabel dalam Bahasa Inggris.
- Jangan menyimpan secret di repo. Jangan ada kredensial default di production.
- Akhiri setiap tahap dengan: lint, typecheck, dan seluruh test dijalankan; laporkan hasil SEBENARNYA (jumlah lulus/gagal/dilewati). Jangan menulis "lulus" untuk sesuatu yang tidak benar-benar dijalankan; tandai jujur bagian yang belum teruji.
- Perbarui docs terkait (DECISIONS, OpenAPI, README) pada setiap tahap.
```

---

## Tahap 1 — Verifikasi nyata dan audit kesenjangan

```
TAHAP 1: verifikasi nyata dan audit kesenjangan terhadap docs/PRD.md (versi 1.0.0). Jangan menambah fitur.

1. Lingkungan: pastikan Docker Desktop menyala, hapus volume development, lalu jalankan dari nol (docker compose up, migrasi, seed). Jika Docker tidak tersedia, gunakan mode tanpa Docker (MariaDB lokal) dan dokumentasikan langkahnya di README untuk Windows.
2. Jalankan pnpm lint, pnpm typecheck, seluruh test backend, frontend, dan e2e Playwright. Laporkan angka SEBENARNYA dan ringkas kegagalan.
3. Buka aplikasi sungguhan lewat browser otomatis dan uji tiap klaim PRD: alur clock-in/clock-out (foto, lokasi, mode kerja, sinkronisasi mode saat clock-out), idempotency, validasi radius Haversine, penanganan akurasi GPS, riwayat terkonsolidasi satu baris per hari, pengajuan cuti dan saldo, validasi circular reference hierarki, alur pengajuan keuangan, dan matriks RBAC.
4. Periksa secara khusus dan laporkan jujur:
   a. Apakah foto presensi bisa dibuka tanpa login lewat URL /uploads/... ?
   b. Di mana token disimpan (cookie httpOnly, localStorage, atau store Zustand)? Apakah mode Bearer aktif?
   c. Apakah ada proteksi CSRF pada request pengubah data?
   d. Apakah endpoint rekrutmen atau tes online dapat diakses tanpa login?
   e. Apa kunci rate limit endpoint presensi dan login (per IP atau per pengguna)?
   f. Apakah browser memanggil Nominatim langsung untuk reverse geocoding?
   g. Apakah ada route API tanpa pengecekan otorisasi? Buat daftar seluruh route beserta pengecekan yang dipakai.
   h. Framework frontend yang sebenarnya dipakai (Next.js atau Vite SPA).
5. Tulis docs/GAP-REPORT.md: tabel Klaim PRD | Status (Terbukti, Sebagian, Tidak terbukti) | Bukti | Catatan. Tulis docs/VERIFICATION.md: daftar fitur, cara uji (otomatis/manual), hasil.
6. Perbaiki HANYA bug yang menghalangi aplikasi berjalan atau test berjalan. Semua temuan lain dicatat di GAP-REPORT untuk tahap berikutnya.
```

---

## Tahap 2 — Perbaikan keamanan dan privasi

```
TAHAP 2: perbaikan celah keamanan dan privasi. Baca docs/GAP-REPORT.md. Jangan menambah fitur bisnis baru.

1. FOTO DAN LAMPIRAN PRIVAT
- Hentikan penyajian statis (express.static) untuk foto presensi, lampiran pengajuan, bukti struk, dan bukti pencairan. Simpan file di luar web root dengan nama tak dapat ditebak (UUID).
- Sajikan lewat endpoint terotorisasi (mis. GET /api/v1/attendance/:id/photo dan endpoint lampiran) yang hanya mengizinkan pemilik, atasan langsung, dan peran dengan akses penuh (Super Admin, HRD) atau permission yang relevan. Header Cache-Control private, X-Content-Type-Options nosniff, dan Cross-Origin-Resource-Policy same-origin.
- Migrasikan file dan path lama; pastikan URL lama /uploads/... tidak lagi dapat diakses publik. Perbarui frontend agar memakai endpoint baru (dengan cookie sesi).

2. REVERSE GEOCODING
- Hapus pemanggilan Nominatim langsung dari browser. Nama lokasi ditampilkan dari master lokasi kerja (untuk mode Kantor) atau "Lokasi lain" dengan koordinat.
- Bila nama tempat tetap diinginkan, lakukan dari backend saja: dikontrol flag environment GEOCODING_ENABLED (default false), hasil dicache dan disimpan di kolom location_label, User-Agent yang mengidentifikasi aplikasi, batas 1 request per detik, dan kegagalan geocoding TIDAK boleh menggagalkan absen.
- Pastikan atribusi OpenStreetMap tampil pada peta Leaflet dan sediakan konfigurasi URL tile agar mudah diganti.

3. AUTENTIKASI DAN SESI
- Access dan refresh token HANYA lewat cookie httpOnly, Secure (production), SameSite=Lax atau Strict. Nonaktifkan mode Bearer header di production. Zustand hanya boleh menyimpan profil non-sensitif (nama, peran, permission), tidak pernah token.
- Proteksi CSRF untuk semua request pengubah data (header kustom wajib atau double-submit token), lengkap dengan test.
- Jangan memakai IP pinning. Gantinya: rotasi refresh token dengan deteksi pemakaian ulang (cabut seluruh family), daftar sesi aktif milik sendiri, dan tombol "Keluar dari semua perangkat".

4. RATE LIMITING
- Endpoint presensi: batas per PENGGUNA (kunci = user id dari sesi, mis. 5 request/menit), ditambah batas per IP yang longgar (mis. 300/menit) agar kantor dengan satu IP bersama tidak terblokir.
- Login dan lupa password: batas per kombinasi akun dan IP, plus lockout akun setelah 5 kali gagal selama 15 menit.

5. UPLOAD
- Validasi isi file (magic bytes), batasi ukuran, dan batasi jumlah piksel input pada sharp (limitInputPixels) untuk mencegah decompression bomb. Buang metadata EXIF. Tolak tipe di luar daftar putih.

6. PRIVASI DATA
- Tampilkan pemberitahuan privasi singkat saat pertama kali karyawan absen (foto, lokasi, tujuan, retensi) dengan tombol persetujuan yang dicatat (siapa dan kapan).
- Implementasikan pengaturan retensi foto (default 12 bulan, job pembersihan dilindungi GET_LOCK, nonaktif sampai diaktifkan HRD). Catat di docs/DECISIONS.md bahwa teks pemberitahuan sebaiknya ditinjau pihak hukum terkait UU PDP.

7. LAIN-LAIN
- Header keamanan (helmet, CSP untuk web), log tanpa token/PII berlebih, dan jalankan pnpm audit.
- Test: akses foto tanpa login ditolak, akses foto milik orang lain ditolak, CSRF ditolak tanpa header, rate limit per pengguna tidak memblokir pengguna lain dari IP yang sama, refresh token reuse mencabut sesi.
- Tulis docs/SECURITY.md berisi ancaman, mitigasi, dan sisa risiko.
```

---

## Tahap 3 — Nonaktifkan modul Rekrutmen

```
TAHAP 3: modul Rekrutmen di luar scope fase 1. Nonaktifkan tanpa menghapus kode atau data.

- Tambahkan feature flag FEATURE_RECRUITMENT (env, default false).
- Saat false: route API rekrutmen dan tes online tidak terpasang (respons 404), halaman /careers dan tes publik tidak tersedia, tidak ada menu atau item di navigasi, job terjadwal terkait tidak berjalan, dan modul tidak muncul di OpenAPI serta matriks RBAC.
- Tabel dan migrasi yang sudah ada dipertahankan (jangan drop data).
- Catat di docs/DECISIONS.md syarat sebelum flag boleh diaktifkan: endpoint publik dilindungi rate limit dan captcha, validasi upload CV, retensi data kandidat, dan konversi kandidat menjadi karyawan tidak boleh mengirim password dalam bentuk apa pun (gunakan undangan set-password bertoken kedaluwarsa).
- Test: dengan flag false, seluruh endpoint dan halaman rekrutmen mengembalikan 404 dan tidak tampil di navigasi.
```

---

## Tahap 4 — Analisis proyek referensi EMS-Portal (hanya baca)

```
TAHAP 4: analisis proyek referensi. MODE READ-ONLY: jangan mengubah repo referensi.

Sumber: https://github.com/HelmiMuhammadHatta/EMS-Portal (clone ke /reference/EMS-Portal di luar source aplikasi; abaikan node_modules, bin, obj, .git). Salinan lokal frontend juga ada di C:\RBAC_Auth\EmployeeManagementSystem\ems-frontend. Jangan menyalin secret, connection string, JWT secret, atau kredensial default ke dokumen mana pun.

Baca seluruh source (EMS.Domain, EMS.Application, EMS.Infrastructure, EMS.API, EMS.Tests, ems-frontend, docker-compose, workflow CI), docs/erd.png, dan screenshot. Jalankan referensi bila memungkinkan untuk memverifikasi flow secara nyata.

Tulis docs/REFERENCE-EMS.md:
1. Stack, versi, struktur solusi, dan konvensi penamaan.
2. Model data: entitas, kolom penting, relasi, enum, indeks.
3. RBAC berbasis permission: KATALOG LENGKAP permission (kode dan deskripsi), role default dan pemetaannya, cara role/permission dibuat dan dikelola, cara permission masuk ke token atau dimuat saat request, handler otorisasi di backend, mekanisme frontend (guard route, pengecekan permission, penentuan menu).
4. Alur autentikasi end-to-end.
5. Modul Karyawan: endpoint dan layar; validasi hierarki tanpa circular reference; CRUD Department dan Position; alur dokumen (validasi, penyimpanan, unduh, hapus fisik); audit trail (mekanisme SaveChanges, format nilai lama/baru, layar log).
6. Modul Cuti: jenis, saldo, state machine, approval, filter gender.
7. Modul Absensi: clock-in/out, Haversine; shift rotasi hanya didokumentasikan, JANGAN diporting.
8. Dashboard: statistik, grafik, endpoint sumber data.
9. Frontend: struktur folder, routing, layout, sidebar, pola TanStack Query, form, tabel, toast, gaya visual.
10. Docker, CI, dan pola test.

Tulis juga docs/REFERENCE-GAPS.md: kelemahan yang ditemukan (mis. token di localStorage, permission hanya dicek di frontend, kredensial default, cakupan test). Catat saja, jangan memperbaiki referensi. Ringkas dan sebut lokasi file; jangan menempel kode mentah dalam jumlah besar. Akhiri dengan daftar pertanyaan untuk hal yang ambigu.
```

---

## Tahap 5 — RBAC berbasis permission dan otorisasi Super Admin/HRD

```
TAHAP 5: ubah otorisasi menjadi RBAC berbasis permission mengikuti model EMS-Portal, dengan aturan baru: HANYA Super Admin dan HRD yang dapat mengakses semuanya. Baca docs/REFERENCE-EMS.md, docs/REFERENCE-GAPS.md, docs/GAP-REPORT.md, docs/SECURITY.md, AGENTS.md, PRD, dan DECISIONS.

A. PEMETAAN LEBIH DULU
Buat docs/ALIGNMENT.md: tabel pemetaan entitas, permission, route, dan layar referensi ke padanannya di CentroAbsen (diganti, ditambah, diubah, ditunda), plus daftar konflik. TAMPILKAN tabel lalu BERHENTI menunggu konfirmasi sebelum refactor besar.

B. MODEL DATA (setelah dikonfirmasi)
- Tabel roles, permissions, role_permissions (dan user_roles bila referensi memakainya). Kode permission memakai konvensi referensi (resource.action).
- Role sistem (seed, tidak dapat dihapus): SuperAdmin, HRD, Executive (label UI "CEO"), Manager (label "Atasan"), Finance (label "Keuangan"), Employee (label "Karyawan").
- SuperAdmin dan HRD bertanda is_full_access = true: otorisasi memberi akses ke SEMUA permission, termasuk permission yang ditambahkan di masa depan, tanpa perlu diberi satu per satu.
- Department (menggantikan divisions), Position, hierarki atasan-bawahan dengan validasi circular reference, field gender untuk filter jenis cuti, dokumen karyawan (KTP, Ijazah, Kontrak; hanya pemegang permission dokumen), audit trail otomatis (nilai lama vs baru, hanya field yang berubah) lewat mekanisme ORM setara override SaveChanges (Prisma extension atau middleware), serta layar log audit.
- Ganti enum peran lama dengan role di database dan migrasikan data pengguna yang ada tanpa kehilangan data. work_arrangement mengikuti PRD: Office, Hybrid, Flexible, Remote.

C. KATALOG PERMISSION (sesuaikan penamaan dengan referensi)
attendance.checkin, attendance.read.self, attendance.read.team, attendance.read.all, attendance.flag.review; leave.request, leave.read.self, leave.read.team, leave.read.all, leave.approve.manager, leave.approve.hr, leave.type.manage, holiday.manage; finance.request, finance.read.self, finance.approve.manager, finance.approve.executive, finance.disburse, finance.read.all, finance.summary; employee.read, employee.create, employee.update, employee.deactivate, employee.import; department.manage, position.manage, workLocation.manage; document.read, document.manage; report.read.team, report.read.finance, report.read.all, report.export; audit.read; role.manage; settings.manage; notification.read.self.

D. PEMETAAN ROLE (di luar SuperAdmin dan HRD yang otomatis penuh)
- Employee: checkin, read.self, leave.request, finance.request, finance.read.self, notification.read.self.
- Manager: semua milik Employee ditambah attendance.read.team, leave.read.team, leave.approve.manager, finance.approve.manager, report.read.team.
- Finance: semua milik Employee ditambah finance.disburse, finance.read.all (hanya yang sudah melewati CEO), report.read.finance.
- Executive: semua milik Employee ditambah finance.approve.executive, finance.summary.
Cakupan data (scope): self, bawahan langsung untuk "team", dan semua untuk *.all.

E. MIDDLEWARE DAN ATURAN
- Middleware/policy terpusat requirePermission('kode'). DEFAULT-DENY: route tanpa deklarasi permission ditolak. Tulis test yang memindai seluruh route Express dan gagal jika ada yang tidak mendeklarasikan permission.
- Data-scope diterapkan di lapisan service/query, bukan hanya di controller.
- PEMISAHAN TUGAS berlaku untuk semua orang termasuk SuperAdmin/HRD: pemohon tidak boleh menyetujui atau mencairkan pengajuannya sendiri. Ketika SuperAdmin/HRD bertindak sebagai pengganti approver lain, tindakan dicatat sebagai "bertindak sebagai pengganti".
- PENGAMAN AKUN: minimal satu SuperAdmin aktif (tolak menonaktifkan atau menurunkan yang terakhir); role sistem tidak dapat dihapus atau diubah namanya; hanya pemegang role.manage yang bisa mengelola role dan permission; akun SuperAdmin pertama dibuat lewat skrip instalasi (pnpm run create-superadmin) yang membaca kredensial dari environment/prompt interaktif, tanpa kredensial default di production, dan wajib ganti password pada login pertama.
- Seluruh tindakan SuperAdmin dan HRD tercatat di audit trail.
- GET /api/v1/me mengembalikan role, permission, dan penanda kemampuan turunan (isManager bila punya bawahan, canApprove, canDisburse, isFullAccess).

F. FRONTEND MINIMAL DI TAHAP INI
Sesuaikan guard dan menu agar berdasarkan permission dari /me, serta layar manajemen role/permission dan log audit untuk pemegang permission terkait. Penataan shell lengkap dikerjakan di Tahap 8.

G. TEST
Unit test evaluasi permission dan is_full_access; test matriks otorisasi (peran x endpoint penting) termasuk penolakan lintas peran; test circular reference; test audit trail dan dokumen; test pengaman SuperAdmin terakhir; test pemisahan tugas. Perbarui seed, OpenAPI, dan docs (PRD, DECISIONS).
```

---

## Tahap 6 — Alur approval keuangan: Atasan, CEO, Keuangan (backend)

```
TAHAP 6: revisi alur pengajuan keuangan di backend. Alur cuti TIDAK berubah. Semua hak akses diimplementasikan sebagai permission (Tahap 5), bukan pengecekan nama peran.

ALUR BARU
Pemohon -> Atasan -> CEO -> Keuangan (pencairan).

JENIS PENGAJUAN
- Reimbursement dan Pembelian (mis. langganan Claude Pro). Kategori: Perjalanan Dinas, Software/Langganan, Perlengkapan Kerja, Lainnya.
- "Cash Advance" (kasbon) tidak dipakai lagi untuk pengajuan baru: nonaktifkan pilihannya, namun pertahankan data lama apa adanya (jangan hapus).
- receipt_photo_path lama dimigrasikan ke request_attachments. Reimbursement wajib bukti; Pembelian wajib minimal satu lampiran (penawaran; tautan boleh di keterangan bila tidak ada file).

STATUS DAN LANGKAH
- Status: Diajukan (menunggu Atasan), MenungguCEO, MenungguPencairan, Dicairkan, Ditolak, Dibatalkan. Label UI: "Menunggu Atasan", "Menunggu CEO", "Menunggu Pencairan", "Sudah Dicairkan", "Ditolak", "Dibatalkan".
- Jenis langkah di approval_steps: Atasan (finance.approve.manager), CEO (finance.approve.executive), Pencairan (finance.disburse).
- Atasan dan CEO: Setujui atau Tolak (alasan WAJIB saat menolak); tidak bisa mengubah nominal.
- Keuangan: "Cairkan" atau Tolak dengan alasan wajib.
- Approver: Atasan = manager_id pemohon; CEO = pengguna aktif berperan Executive yang ditetapkan di app_settings (finance_ceo_user_id, default Executive aktif pertama); Keuangan = pool pengguna dengan permission finance.disburse (siapa pun boleh mencairkan, yang pertama bertindak memproses).
- SuperAdmin/HRD dapat bertindak di setiap langkah sebagai pengganti (tercatat), KECUALI pada pengajuan miliknya sendiri.

ATURAN KHUSUS
- Deduplikasi: bila atasan pemohon sudah CEO atau approver dua langkah berurutan orang yang sama, langkah Atasan ditandai Skipped dengan catatan otomatis.
- Pemohon adalah CEO: lewati langkah Atasan dan CEO, langsung ke Pencairan, dengan flag "diajukan_oleh_ceo" yang tampil di layar Keuangan (catat di DECISIONS sebagai keputusan yang perlu dikonfirmasi pemilik bisnis).
- Pemohon berperan Keuangan: tidak boleh mencairkan pengajuannya sendiri.
- Ambang nominal app_settings finance_ceo_threshold_idr: default 0 = SEMUA pengajuan wajib CEO; bila > 0, nominal di bawah ambang melewati langkah CEO (Skipped). Berlaku hanya untuk pengajuan baru.
- Pembatalan oleh pemohon hanya saat masih "Menunggu Atasan".

PENCAIRAN
- Tabel finance_disbursements: finance_request_id (unik), disbursed_by, disbursed_at, method [Transfer|Tunai|Lainnya], reference_no, amount_idr (snapshot), note. Bukti transfer opsional (DisbursementProof, JPG/PNG/PDF, maks 5 MB, validasi isi file, disajikan lewat endpoint terotorisasi).
- Tanggal pencairan default hari ini dan tidak boleh di masa depan. Tidak ada pencairan parsial.
- Semua perubahan dalam satu transaksi. Cegah keputusan/pencairan ganda dengan compare-and-set (UPDATE ... WHERE status = ...) dan constraint unik.

NOTIFIKASI
Ke Atasan saat diajukan; ke CEO saat Atasan setuju; ke semua pemegang finance.disburse saat CEO setuju; ke pemohon pada setiap keputusan dan saat dicairkan (sertakan tanggal dan metode).

ENDPOINT
Antrian dan riwayat untuk CEO; antrian Keuangan dengan tab menunggu pencairan, dicairkan, ditolak; POST /api/v1/finance-requests/:id/disburse; ringkasan CEO (jumlah dan nominal menunggu, disetujui bulan ini, per kategori); ringkasan Keuangan (menunggu pencairan, dicairkan bulan ini, ditolak bulan ini); detail dengan timeline empat langkah; HRD/SuperAdmin dapat menugaskan ulang approver dengan audit log. Laporan Excel keuangan menambah kolom tanggal tiap tahap, status akhir, tanggal pencairan, metode, dan nomor referensi.

MIGRASI DATA
Pengajuan yang masih berjalan disesuaikan ke alur baru; yang berstatus Approved/Paid di alur lama dipetakan ke Dicairkan dengan catatan "migrasi alur lama". Dokumentasikan; jangan hapus data lama.

TEST
Alur penuh empat langkah; penolakan di tiap langkah; deduplikasi; pemohon CEO; pemohon Keuangan; pemohon SuperAdmin/HRD tidak bisa menyetujui miliknya sendiri; ambang nominal; keputusan dan pencairan ganda paralel; akses lintas peran; migrasi data.
```

---

## Tahap 7 — Melengkapi backend yang kurang

```
TAHAP 7: lengkapi kekurangan backend berdasarkan docs/GAP-REPORT.md dan PRD. Gunakan permission dari Tahap 5 untuk setiap endpoint baru.

1. AUTENTIKASI: pastikan lengkap dan teruji: login NIK/email, lockout, lupa dan reset password (email bertoken sekali pakai 30 menit lewat SMTP; Mailpit di dev), ganti password (wajib password lama), wajib ganti password pada login pertama, daftar sesi aktif dan cabut sesi.
2. ABSENSI:
   - Pindahkan pengelompokan riwayat (satu baris per hari) dari memori Node.js ke query SQL (GROUP BY user_id, work_date) dengan pagination dan indeks yang tepat.
   - Job harian node-cron (Asia/Jakarta, dilindungi GET_LOCK): tandai "Belum Absen Keluar" dan bentuk rekap "Tidak Hadir" untuk hari kerja tanpa absensi, tanpa cuti disetujui, dan bukan libur.
   - Endpoint ringkasan bulanan (hadir, terlambat, tidak hadir, belum absen keluar).
   - Peninjauan flag (mode_kerja_tidak_sesuai, akurasi_rendah, jam_perangkat_tidak_sinkron) oleh pemegang attendance.flag.review: tandai ditinjau dengan catatan.
3. CUTI: CRUD jenis cuti (kuota, wajib lampiran, requires_hr_approval), CRUD hari libur nasional, langkah HR bersyarat, validasi tumpang tindih tanggal, lampiran, pembatalan (pemohon saat masih menunggu; HRD/SuperAdmin setelah disetujui dengan pengembalian saldo), konsistensi pending_days/used_days/remaining_days, dan filter jenis cuti berdasarkan gender.
4. KARYAWAN: impor CSV karyawan (validasi per baris, laporan baris gagal, pratinjau, undangan set-password), CRUD Department dan Position.
5. NOTIFIKASI: tabel dan endpoint daftar, jumlah belum dibaca, tandai dibaca, dengan tautan langsung ke halaman terkait; dibuat otomatis untuk cuti dan keuangan.
6. KOTAK MASUK PERSETUJUAN TERPADU: GET /api/v1/approvals/inbox (gabungan cuti dan keuangan sesuai permission pengguna, dengan filter tipe/status/anggota/tanggal dan pagination), GET /api/v1/approvals/inbox/count untuk badge, dan riwayat keputusan pengguna.
7. LAPORAN DAN DASHBOARD: laporan absensi harian/bulanan, cuti, dan keuangan dengan filter periode/karyawan/departemen/lokasi/status; ekspor Excel memakai exceljs dengan streaming, kolom berformat, ringkasan per karyawan, nama file berisi periode; endpoint dashboard (statistik karyawan dan departemen, tren kehadiran 7/30 hari, status cuti, ringkasan persetujuan dan pencairan) yang datanya mengikuti permission pengguna.
8. PENGATURAN: endpoint app_settings (jam kerja default, toleransi, retensi foto, finance_ceo_user_id, finance_ceo_threshold_idr).
9. Pastikan query efisien (indeks, tanpa N+1) untuk 100 karyawan x 12 bulan dan tinjau rencana query (EXPLAIN) untuk laporan.
10. Test integrasi untuk semua endpoint baru, termasuk akses lintas peran dan job harian.
```

---

## Tahap 8 — Frontend HRIS: satu aplikasi, satu login

```
TAHAP 8: satukan seluruh frontend menjadi SATU aplikasi HRIS CentroAbsen dengan satu login, satu shell, dan menu berdasarkan permission. Baca docs/UI-SPEC.md dan docs/REFERENCE-EMS.md (tiru struktur folder, pola halaman, layout, dan gaya visual referensi). Fase 1 tanpa payroll, slip gaji, pajak, BPJS, lembur, fingerprint, shift, dan rekrutmen di navigasi.

1. HAPUS MOCK: "/" mengarah ke /login (belum masuk) atau Beranda (sudah masuk). Hapus halaman "Pilih modul antarmuka" dan semua layar/komponen statis serta data palsu. Bila backend tidak terjangkau, tampilkan error state yang jelas dengan tombol coba lagi.
2. FRAMEWORK: gunakan framework yang benar-benar dipakai di kode (hasil Tahap 1); jangan menambah framework baru. Pastikan PWA: manifest (nama CentroAbsen, ikon, standalone), service worker yang hanya men-cache app shell dan aset statis (jangan meng-cache API, foto, atau data pribadi), halaman offline, dan petunjuk "Pasang aplikasi".
3. MODEL AKSES: semua pengguna adalah karyawan; hak tambahan hanya menambah menu. Menu dan route guard ditentukan dari permission di GET /api/v1/me; backend tetap sumber kebenaran. Super Admin dan HRD melihat seluruh menu.
4. SHELL:
   - Mobile: bottom navigation 4 menu (Beranda, Riwayat, Pengajuan, Profil). Approver mendapat badge di Pengajuan dan segmented control "Pengajuan Saya" | "Perlu Persetujuan (n)".
   - Desktop: satu sidebar dengan grup yang hanya tampil bila berhak: Saya, Persetujuan (badge), Tim (Atasan), Pencairan (Keuangan), Ringkasan Keuangan (CEO), Administrasi (HRD/Super Admin: Ringkasan, Absensi, Karyawan, Departemen dan Jabatan, Lokasi Kerja, Cuti dan Libur, Laporan, Log Audit, Role dan Permission, Pengaturan).
   - Beranda: satu tombol absen sebagai tindakan utama; untuk approver, bagian "Perlu tindakan Anda" (maks 5 item + "Lihat semua").
   - Setelah login arahkan ke returnTo bila ada; notifikasi menaut langsung ke detail; halaman 403 yang ramah untuk URL terlarang.
5. ABSENSI (ikuti docs/UI-SPEC.md): alur langkah demi langkah dengan pemilihan "Kerja dari" (Kantor, Rumah, Lokasi Lain; clock-out mengikuti mode clock-in), kamera langsung tanpa galeri, preview, validasi lokasi/radius/akurasi, kirim dengan Idempotency-Key, dan seluruh state (izin ditolak, akurasi buruk, di luar radius, gagal koneksi dengan ulang, sudah absen). Foto dimuat lewat endpoint terotorisasi. Tampilkan pemberitahuan privasi saat absen pertama.
6. RIWAYAT dan DETAIL: ringkasan bulanan, filter, daftar per tanggal, detail dengan foto, peta, koordinat, akurasi, waktu server, dan flag ramah.
7. PENGAJUAN: form cuti dan keuangan (Reimbursement/Pembelian, nominal Rupiah dengan format otomatis, lampiran), ringkasan sebelum kirim, timeline persetujuan (cuti: Diajukan -> Atasan -> HRD bila perlu; keuangan: Diajukan -> Atasan -> CEO -> Pencairan sesuai aturan server), badge status dengan label baru (teks tetap terbaca), detail pencairan bagi pemohon, dan tombol Batalkan hanya saat "Menunggu Atasan".
8. KOTAK MASUK PERSETUJUAN: satu halaman dengan tab "Perlu tindakan" dan "Riwayat keputusan", filter tipe, detail di side panel (desktop) atau halaman (mobile) berisi konteks lengkap. Aksi: Atasan/CEO Setujui/Tolak; Keuangan Cairkan (drawer: tanggal, metode, nomor referensi, catatan, bukti; konfirmasi karena final) atau Tolak. Alasan wajib saat menolak, tanpa bulk approval.
9. HALAMAN KHUSUS: Tim (ringkasan hadir/terlambat/tidak hadir/belum absen keluar), Ringkasan Keuangan (CEO), Pencairan (tiga tab dan ringkasan nominal; penanda "Diajukan oleh CEO").
10. ADMINISTRASI (HRD/Super Admin): dashboard analitik, manajemen karyawan (tabel, tambah/ubah lewat side panel, hierarki dengan pesan circular reference yang jelas, dokumen, impor CSV), Department dan Position, Lokasi Kerja (peta, radius, preview geofence), Cuti dan Libur, tinjauan flag presensi, Laporan dengan tombol "Ekspor Excel", Log Audit, manajemen Role dan Permission, Pengaturan (jam kerja, retensi foto, CEO aktif, ambang persetujuan CEO).
11. NOTIFIKASI dan PROFIL: halaman notifikasi, profil (data diri, atasan, lokasi, ganti password, sesi aktif, keluar).
12. Perbarui docs/UI-SPEC.md dan DECISIONS. Semua state loading/kosong/error, kontras dan sentuh 44px, navigasi keyboard.
13. TEST Playwright: karyawan biasa tidak melihat menu persetujuan dan /persetujuan menampilkan 403; Atasan login, absen, lalu menyetujui cuti bawahan dari akun yang sama; alur keuangan penuh (karyawan, atasan, CEO, Keuangan mencairkan, karyawan melihat "Sudah Dicairkan"); penolakan CEO dengan alasan; deep link belum login diarahkan ke login lalu kembali; Super Admin/HRD melihat semua menu Administrasi; Keuangan tidak melihat Administrasi; skenario gagal absen (izin kamera ditolak, di luar radius, koneksi putus lalu ulang, absen ganda). Laporkan hasil SEBENARNYA.
```

---

## Tahap 9 — Swagger/OpenAPI

```
TAHAP 9: dokumentasi API Swagger/OpenAPI yang lengkap dan akurat. Jangan mengubah perilaku API.

1. Spesifikasi OpenAPI 3.1 dibangkitkan otomatis dari skema Zod (mis. zod-to-openapi); enum dan status dari packages/shared. Tersedia di /api/docs (Swagger UI atau Scalar) dan /api/docs/openapi.json. Skrip pnpm docs:openapi mengekspor ke docs/openapi.json, dan ada pemeriksaan agar spesifikasi tidak usang.
2. Cakupan SEMUA endpoint /api/v1: auth, me, users, departments, positions, master data, dokumen, attendance, leave, finance (termasuk approval Atasan/CEO dan pencairan), approvals inbox, reports, notifications, audit, roles/permissions, settings, health, time. Setiap endpoint: tag Bahasa Indonesia, ringkasan, deskripsi aturan bisnis, permission yang dibutuhkan, skema request/response, contoh data realistis, dan respons error umum (400, 401, 403, 404, 409, 422, 429) dengan skema error seragam. Modul rekrutmen tidak tampil saat flag nonaktif.
3. Keamanan: jelaskan autentikasi cookie httpOnly dan header anti-CSRF; multipart (absensi, lampiran, bukti pencairan) mendokumentasikan field file, batas, tipe, dan Idempotency-Key.
4. Overview berisi alur contoh: absen masuk dan pengajuan keuangan empat langkah beserta endpoint di tiap langkah.
5. KEMUDAHAN UJI (development): Swagger UI dapat menguji semua alur tanpa frontend: cookie hasil login terpakai otomatis, header CSRF disisipkan otomatis (requestInterceptor). Overview menampilkan tabel akun seed untuk tiap peran (Karyawan, Atasan, CEO, Keuangan, HRD, Super Admin) HANYA di development. Sediakan contoh request yang saling nyambung dan docs/API-QUICKSTART.md, serta docs/openapi.json yang bisa diimpor ke Postman atau Bruno.
6. Production: dokumentasi nonaktif atau hanya untuk Super Admin/HRD lewat flag environment; tidak terbuka untuk publik.
7. Test kontrak: setiap route Express punya definisi di spesifikasi (dan sebaliknya); lint spesifikasi (Spectral) tanpa error.
```

---

## Tahap 10 — PRD v2, QA, dan rilis

```
TAHAP 10: dokumentasi final berbasis bukti dan kesiapan rilis. Jangan menambah fitur.

1. TULIS ULANG docs/PRD.md sebagai versi 2.0.0 yang menggambarkan kondisi NYATA aplikasi (as-built) dan kekurangan yang tersisa. Isi:
   - Ikhtisar, skala, zona waktu, jam kerja, work arrangement (Office, Hybrid, Flexible, Remote), dan mode presensi.
   - Stack yang benar-benar dipakai (satu frontend saja, sesuai kode).
   - Peran dan MATRIKS RBAC baru: Karyawan, Atasan, Keuangan, CEO, HRD, Super Admin (Super Admin dan HRD akses penuh; pemisahan tugas; pengaman akun).
   - Modul: Autentikasi dan sesi, Presensi, Cuti, Struktur perusahaan dan karyawan (Department, Position, hierarki anti-circular, dokumen), Pengajuan keuangan empat langkah dan pencairan, Notifikasi dan kotak masuk persetujuan, Laporan dan dashboard, Audit trail.
   - Model data (ERD dari skema Prisma), ringkasan API (rujuk OpenAPI).
   - Persyaratan non-fungsional: keamanan dan privasi (foto privat, CSRF, rate limit, retensi), performa (target waktu absen, query), backup dan restore, retensi data.
   - Kriteria penerimaan per modul, lengkap dengan tautan ke test atau bukti di docs/VERIFICATION.md.
   - Di luar scope fase 1: payroll, slip gaji, pajak, BPJS, lembur otomatis, fingerprint, shift, rekrutmen (nonaktif via flag). Roadmap fase berikutnya.
   - Keterbatasan yang diketahui, termasuk mock location pada PWA dan akurasi GPS pada desktop, ditulis JUJUR. Hapus semua klaim yang tidak didukung bukti.
   - Perbaiki typo dan istilah yang tidak konsisten.
2. Jalankan audit akhir: setiap kebutuhan PRD v2 ditandai lulus/gagal dengan bukti di docs/QA-CHECKLIST.md; perbaiki yang gagal.
3. Keamanan: tinjau OWASP Top 10 terhadap kode, uji IDOR pada setiap endpoint (lintas peran dan lintas pengguna), pastikan tidak ada route tanpa permission, jalankan pnpm audit, dan perbarui docs/SECURITY.md.
4. Aksesibilitas (axe pada halaman utama tiap peran), performa dan PWA (Lighthouse mobile untuk Beranda dan alur absen; target Performance >= 85, PWA lolos; absen selesai < 5 detik pada 4G simulasi; foto terkirim 150-250 KB).
5. Deployment: docker compose production (reverse proxy HTTPS, env terpisah, build multi-stage, proses Node non-root, volume database dan file), prisma migrate deploy, skrip backup harian MariaDB dan folder foto dengan prosedur restore yang sudah diuji, healthcheck, dan log. Dokumentasikan di docs/DEPLOYMENT.md termasuk perkiraan kebutuhan penyimpanan dan cara membuat Super Admin pertama.
6. Panduan pengguna singkat per peran (Karyawan, Atasan, Keuangan, CEO, HRD, Super Admin) dalam Bahasa Indonesia di docs/USER-GUIDE.md.
7. Laporan rilis: fitur selesai, hasil test SEBENARNYA, batasan yang diketahui, dan saran fase berikutnya.
```
