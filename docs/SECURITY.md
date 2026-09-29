# Laporan Keamanan & Mitigasi Risiko (SECURITY.md)

**Aplikasi:** CentroAbsen (HRIS & Presence System)  
**Versi:** 1.0.0 (Tahap 2 Release)  
**Tanggal:** 29 September 2026  

---

## 1. ANCAMAN UTAMA & STRATEGI MITIGASI (THREAT MATRIX)

| ID Ancaman | Deskripsi Ancaman | Tingkat Risiko | Mekanisme Mitigasi Terpasang |
| :--- | :--- | :---: | :--- |
| **THREAT-01** | Akses publik tak terotorisasi terhadap foto presensi karyawan (`/uploads/...`). | **Tinggi** | Menghapus `express.static('/uploads')`. Foto disajikan melalui endpoint terotorisasi `GET /api/v1/attendances/:id/photo` dengan verifikasi pemilik (`user_id`), atasan (`manager_id`), atau peran Admin/HR. |
| **THREAT-02** | Kebocoran lokasi/IP pengguna ke server pihak ketiga dari client side (Nominatim). | **Sedang** | Menghapus panggilan Nominatim dari browser client. Lokasi presensi menggunakan master `PrimaryWorkLocation` atau label `"Lokasi lain (lat, lon)"`. Backend geocoding dikontrol opsional via `GEOCODING_ENABLED`. |
| **THREAT-03** | Serangan Cross-Site Request Forgery (CSRF) pada pengubahan data. | **Tinggi** | Middleware `requireCsrf` mewajibkan kustom header `X-CSRF-Token` pada request pengubah data (`POST`, `PUT`, `DELETE`, `PATCH`). |
| **THREAT-04** | Denial of Service (DoS) dari IP kantor bersama (Shared NAT IP). | **Tinggi** | Menerapkan rate limit ganda: **User Rate Limit** (5 request/menit per User ID pada endpoint presensi) dan **IP Rate Limit** (300 request/menit per IP) agar pengguna di belakang NAT kantor yang sama tidak saling memblokir. |
| **THREAT-05** | Serangan Decompression Bomb / Image Bomb pada upload foto. | **Sedang** | Konfigurasi Sharp `{ limitInputPixels: 4096 * 4096 }` untuk membatasi ukuran memori dekompresi piksel, validasi magic bytes JPEG, dan batas file 1MB. |
| **THREAT-06** | Serangan Token Reuse / Pencurian Refresh Token. | **Tinggi** | Sesi disimpan dalam `HttpOnly` Cookie dengan `SameSite=Lax`. Token reuse memicu pencabutan famili token pengguna dan logout paksa. |
| **THREAT-07** | Pelanggaran Privasi Data Pribadi (UU PDP No. 27 Tahun 2022). | **Sedang** | Pemberitahuan privasi singkat saat presensi (foto, lokasi, tujuan, retensi 12 bulan) dengan penandaan persetujuan pengguna. |

---

## 2. SECURITY HEADERS & PROTEKSI PERANGKAT KERAS

### 2.1 HTTP Security Headers (Helmet)
Backend mengonfigurasi header keamanan terstandar:
- `Cross-Origin-Resource-Policy: same-origin`
- `X-Content-Type-Options: nosniff`
- `Cache-Control: private, max-age=3600` (pada rute file media)
- `Strict-Transport-Security: max-age=15552000; includeSubDomains`

### 2.2 Privasi Geolocation Client
Browser tidak lagi mengirimkan koordinat mentah ke API geocoding publik. Penanganan fallback geokordinat diproses secara terisolasi tanpa memblokir kegagalan presensi.

---

## 3. SISA RISIKO & REKOMENDASI PRODUKSI (RESIDUAL RISKS)

1. **Hardware Wi-Fi Geolocation Drift**: Penggunaan PC/Laptop tanpa GPS fisik dapat menghasilkan akurasi berbasis Wi-Fi IP (>100 meter). Dianjurkan karyawan menggunakan perangkat mobile dengan sensor GPS terdedikasi untuk presensi WFO.
2. **Review Hukum UU PDP**: Teks pemberitahuan privasi sebaiknya ditinjau ulang oleh tim legal/hukum perusahaan terkait penyesuaian regulasi UU PDP terbaru.
