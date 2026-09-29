# API Quickstart & Swagger UI

Dokumen ini menjelaskan cara menggunakan Swagger UI bawaan (saat *development*) untuk menguji alur sistem CentroAbsen secara lengkap tanpa menggunakan *frontend*.

## Cara Akses Swagger
1. Pastikan *backend* berjalan (`pnpm --filter @centroabsen/api dev`).
2. Buka *browser* ke **`http://localhost:4000/api/docs`**.

## Fitur Kemudahan Uji
- **Auto Cookies**: Setelah memanggil `/auth/login`, token *cookie* akan otomatis digunakan untuk me-request endpoint selanjutnya.
- **Auto Anti-CSRF**: Swagger UI akan otomatis menyisipkan header anti-CSRF sehingga Anda tidak perlu menambahkannya secara manual tiap kali *request*.

## Skenario Pengujian Penuh (End-to-End)
Anda bisa mencoba contoh request di Swagger secara berurutan:

1. **Login Karyawan**
   - Endpoint: `POST /api/v1/auth/login`
   - Gunakan email/NIK Karyawan (contoh: `kry001@centroabsen.local`)
   - *Execute*. Anda akan ter-otentikasi.
2. **Absen Masuk**
   - Endpoint: `POST /api/v1/attendance/in`
   - (Gunakan contoh data lokasi `loc-hq-001`).
3. **Ajukan Pengajuan Keuangan (Reimbursement)**
   - Endpoint: `POST /api/v1/finance/reimbursement`
   - Ambil (copy) `id` pengajuan yang didapatkan dari response.
4. **Persetujuan Atasan**
   - Login ulang menggunakan akun Atasan (`spv001@centroabsen.local`).
   - Endpoint: `POST /api/v1/finance/reimbursement/{id}/approve-manager` (Paste ID pengajuan tadi).
5. **Persetujuan CEO**
   - Login ulang menggunakan akun CEO (`ceo001@centroabsen.local`).
   - Endpoint: `POST /api/v1/finance/reimbursement/{id}/approve-ceo`.
6. **Pencairan Keuangan**
   - Login ulang menggunakan akun Keuangan (`fin001@centroabsen.local`).
   - Endpoint: `POST /api/v1/finance/reimbursement/{id}/disburse`.

## Ekspor Koleksi (Postman / Bruno)
Anda juga bisa mengimpor definisi API langsung ke Postman, Bruno, atau Insomnia menggunakan file **`docs/openapi.json`**.
