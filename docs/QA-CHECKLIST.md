# Checklist Kualitas (QA) & Kepatuhan PRD
Status Aplikasi: SIAP RILIS (Fase 1)

| Fitur | Status | Bukti / Catatan |
|---|---|---|
| **Infrastruktur & Arsitektur** |
| Monorepo & Pnpm Workspaces | LULUS | `pnpm-workspace.yaml`, `apps/api`, `apps/web`, `packages/shared`. |
| Database MariaDB 13 & Prisma | LULUS | `schema.prisma`, UUIDv7 dipakai sebagai primary key. |
| **Keamanan & Autentikasi** |
| Argon2 Password Hash | LULUS | Diimplementasi di `auth.service.ts`. |
| JWT & Refresh Token Rotation | LULUS | Rotasi family token dan cookie HTTPOnly dikonfigurasi. |
| CSRF & Lockout | LULUS | *Interceptor* Axios `X-CentroAbsen-Client` dan *lockout* 5x gagal. |
| **Absensi Karyawan** |
| Deteksi Mode Kerja | LULUS | Kantor (Validasi Radius Haversine), Rumah/Anywhere (Flag HR). |
| Deteksi Akurasi & Waktu Perangkat | LULUS | *Flag* `akurasi_rendah` (50-100m) dan `jam_perangkat_tidak_sinkron`. |
| Foto Kamera Depan | LULUS | PWA `getUserMedia` `facingMode: user`, kompresi Sharp ke ~150-250KB. |
| Idempotency Key | LULUS | Transaksi *check-in/check-out* kebal *race-condition*. |
| **Cuti & Keuangan** |
| Engine Approval Multi-Level | LULUS | Transaksi Prisma `compare-and-set` untuk aman dari *double-approval*. |
| Pengurang Saldo Atomic | LULUS | *Decrement* otomatis hanya saat status `Approved`. |
| Export Laporan Excel | LULUS | `ReportController` via `exceljs` menggunakan pola *Streaming*. |
| **Frontend & PWA** |
| PWA Manifest & Service Worker | LULUS | Menggunakan `@serwist/next`, lolos Lighthouse. |
| Aksesibilitas Touch Target | LULUS | Komponen tombol minimal `44px` tinggi (`h-11`). |
