# CentroAbsen - PRD & Konteks Proyek

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
