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
- **Keputusan 5.2 (Pemusatan Geocoding Backend)**: Menghapus panggilan API Nominatim langsung dari browser client.
- **Alasan 5.2**: Mencegah kebebasan pencatatan alamat luar yang dapat memicu kebocoran IP client ke server pihak ketiga serta mengurangi dependensi jaringan di sisi browser.
- **Implementasi 5.2**: Label lokasi dibuat dari master `PrimaryWorkLocation` (mode Office) atau label `"Lokasi lain (lat, lon)"`. Backend juga dilengkapi flag opsional `GEOCODING_ENABLED=true` dengan penanganan fail-safe yang tidak akan menggagalkan absen jika rute geocoding mengalami kendala.
