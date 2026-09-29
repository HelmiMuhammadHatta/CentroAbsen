# Audit Keamanan (Security Hardening)

Aplikasi telah diperiksa berdasarkan kerentanan standar OWASP Top 10.

## 1. Perlindungan Access Control (IDOR)
Semua *endpoint* yang berinteraksi dengan identitas Karyawan dilindungi menggunakan validasi *middleware* dari JWT. Seorang Karyawan **tidak bisa** memanggil data riwayat absensi atau saldo cuti milik `user_id` lain melalui API.

## 2. Injeksi & Database
Menggunakan Prisma ORM sehingga seluruh input parameter disanitasi secara *default*. Tidak ada penggunaan *raw query* dinamis yang berpotensi memunculkan celah SQL Injection.

## 3. Upload File
File *multipart/form-data* (foto absen, bukti nota) divalidasi mutlak menggunakan pustaka `file-type` pada *buffer memory*. Bila karyawan merename ekstensi `virus.exe` menjadi `virus.jpg`, *backend* akan menolak karena tanda tangan *binary* (Magic Bytes) bukan JPEG.

## 4. Rate Limiting & Lockout
- `express-rate-limit` dipasang di level server.
- Akun akan terkunci 15 menit jika sandi salah berturut-turut sebanyak 5 kali (*brute-force mitigation*).

## 5. Cookie & HTTP Headers
- *Access Token* dan *Refresh Token* disimpan sebagai `httpOnly`, `Secure` (di production), dan `SameSite=Lax`. XSS tidak dapat mencuri token.
- CSP, X-Frame-Options (Clickjacking), dan Referrer-Policy diatur pada level Next.js HTTP *Headers*.
