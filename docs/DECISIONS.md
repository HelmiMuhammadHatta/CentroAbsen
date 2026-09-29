# Catatan Keputusan Teknis (DECISIONS.md)

Dokumen ini mencatat keputusan-keputusan teknis dan desain arsitektur yang diambil selama pengembangan CentroAbsen.

## 1. RBAC (Role-Based Access Control) Dinamis
- **Keputusan**: Mengganti enum `Role` statis di Prisma dengan tabel relasional `roles`, `permissions`, dan `role_permissions`.
- **Alasan**: Sesuai dengan spesifikasi referensi EMS-Portal, RBAC harus granular (mis. `employee.read`, `leave.approve`). Hardcode enum tidak fleksibel untuk penambahan izin dinamis di masa depan tanpa harus melakukan deploy kode baru.
- **Implementasi**: 
  - Token JWT sekarang **hanya** menyimpan `userId`. 
  - Middleware `requireAuth` dan `requirePermission` (di `auth.middleware.ts`) secara dinamis memuat izin pengguna setiap request.

## 2. Audit Trail Otomatis
- **Keputusan**: Menggunakan Prisma Client Extensions untuk mencatat jejak audit (Audit Trail) secara otomatis.
- **Alasan**: Mencegah kelalaian developer dalam memanggil fungsi log secara manual.
- **Implementasi**: Ekstensi di `utils/prisma.ts` meng-intercept operasi `create`, `update`, dan `delete` pada entitas krusial (seperti User, Role, Department). Ia mencatat status objek sebelum (`before_json`) dan sesudah (`after_json`) perubahan ke tabel `AuditLog`. Semua service diubah agar menggunakan instance Prisma terpusat ini.

## 3. Mitigasi Circular Reference Hierarki Karyawan
- **Keputusan**: Melakukan validasi iteratif/rekursif (N-Level Check) setiap ada pembaruan `manager_id` di `EmployeeService`.
- **Alasan**: Basis data relasional murni sulit menangani proteksi circular constraint bawaan (misal User A manajer User B, dan User B manajer User A).
- **Implementasi**: Validasi `checkCircularReference` berjalan sebelum operasi `UPDATE`. Jika loop terdeteksi (seperti A -> B -> A), proses digagalkan dengan pesan error.

## 4. Absensi & Mode Kerja (Fitur Khas CentroAbsen)
- **Keputusan**: Fitur otentikasi wajah (opsional/mock), geo-location (haversine formula), serta `WorkMode` (Office, Home, Anywhere) tetap dipertahankan.
- **Alasan**: Fitur ini adalah nilai jual utama CentroAbsen yang tidak ada di referensi murni EMS-Portal. Model ini berjalan harmonis di atas pondasi RBAC baru.

## 5. Tahap 2 — Perbaikan Keamanan, Privasi Foto & Geocoding (Privat & Controlled)
- **Keputusan 5.1 (Foto & Lampiran Privat)**: Menghentikan penyajian publik `express.static('/uploads')`. Foto presensi kini hanya dapat diakses melalui endpoint terotorisasi `GET /api/v1/attendances/:id/photo`.
- **Alasan 5.1**: Mencegah kebocoran privasi foto karyawan ke publik melalui URL statis tak terotentikasi.
- **Implementasi 5.1**: Endpoint memeriksa otorisasi pemanggil (`Owner`, `Direct Manager`, atau `HR/Admin`). Menambahkan header `Cache-Control: private, max-age=3600`, `X-Content-Type-Options: nosniff`, dan `Cross-Origin-Resource-Policy: same-origin`.
- **Implementasi 5.2**: Label lokasi dibuat dari master `PrimaryWorkLocation` (mode Office) atau label `"Lokasi lain (lat, lon)"`. Backend juga dilengkapi flag opsional `GEOCODING_ENABLED=true` dengan penanganan fail-safe yang tidak akan menggagalkan absen jika rute geocoding mengalami kendala.

## 6. Tahap 5 — Desain Sistem, Layout Mobile-First, dan PWA
- **Keputusan 6.1 (Desain Sistem & Layout)**: Mengadopsi Shadcn UI dengan Tailwind CSS untuk mempercepat pembuatan komponen konsisten dengan Plus Jakarta Sans. Layout dipisah jadi Bottom Navigation untuk Mobile dan Sidebar ringkas untuk Desktop.
- **Keputusan 6.2 (Absen & Pengajuan)**: Modul absensi diubah untuk menampilkan UI kamera dan peta secara terpadu. Pengajuan disederhanakan dengan fitur *Drawer* dan 2 Tab (Cuti, Keuangan).

## 7. Tahap 6 — Alur Approval Keuangan (Atasan, CEO, Keuangan)
- **Keputusan 7.1 (Alur Baru 4 Langkah)**: Mengimplementasikan alur pengajuan keuangan 4 langkah: Pemohon -> Atasan -> CEO -> Keuangan (Pencairan).
- **Keputusan 7.2 (Pencairan & Compare-and-Set)**: Tabel `finance_disbursements` menyimpan snapshot transaksi pencairan. Status diubah secara atomik menggunakan compare-and-set (`WHERE status = 'MenungguPencairan'`) untuk mencegah pencairan ganda/paralel.
- **Keputusan 7.3 (Pemohon CEO & Flag `is_ceo_submitted`)**: Jika pemohon adalah CEO, langkah Atasan & CEO otomatis ditandai `Skipped` dan pengajuan langsung menuju status `MenungguPencairan` dengan flag `is_ceo_submitted = true` yang ditampilkan di antarmuka Keuangan.
- **Keputusan 7.4 (Proteksi Self-Disbursement)**: Pengguna berperan Keuangan (`finance.disburse`) dilarang keras mencairkan dana dari pengajuan yang mereka buat sendiri.
- **Keputusan 7.5 (Depresiasi Kasbon)**: Fitur "Cash Advance" (kasbon) dinonaktifkan untuk pengajuan baru, namun data lama tetap dipertahankan secara utuh di database.
