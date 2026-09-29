# Aturan Kerja CentroAbsen (Agents Rules)

Berikut adalah panduan dan aturan kerja untuk asisten AI pada proyek CentroAbsen:

## STACK & TEKNOLOGI
- **Monorepo**: pnpm workspaces (`apps/api`, `apps/web`, `packages/shared`).
- **Backend**: Express.js v5, Prisma ORM (MariaDB 11.4), Zod, pino.
- **Frontend**: Next.js (App Router), React, Tailwind CSS, TanStack Query.
- **Database**: MariaDB 11.4 LTS (InnoDB, utf8mb4). Primary key: UUID v7 (simpan CHAR(36)).
- **Ketentuan DB**: Jangan pakai tipe bawaan JSON MariaDB. Simpan data semi-terstruktur sebagai LONGTEXT atau tabel terpisah. Waktu disimpan DATETIME(3) dalam UTC.
- **Infrastruktur**: Docker Compose.

## ATURAN KERJA
1. **Perencanaan**: Sebelum menulis kode di setiap tahap, buat *implementation plan* singkat, lalu kerjakan sesuai plan.
2. **Fokus**: Kerjakan HANYA yang diminta di tahap tersebut (Fase 1). DILARANG menambah fitur di luar scope (seperti payroll, slip gaji, lembur, shift).
3. **Keputusan**: Jika ada ambiguitas bisnis, pilih default paling aman dan dokumentasikan di `docs/DECISIONS.md`. Jangan mengarang diam-diam.
4. **Validasi & Tes**: Setiap tahap selesai jika: build lulus, lint/typecheck lulus, test lulus. Berikan ringkasan perubahan dan sisa tugas.
5. **Bahasa**: Teks UI, pesan error, status, contoh data -> **Bahasa Indonesia**. Kode, nama variabel, tabel -> **Bahasa Inggris**.
6. **Keamanan**: DILARANG keras menaruh *secret* di repo. Pakai `.env.example` dan validasi `.env` dengan Zod di startup.
7. **Commit**: Buat commit kecil dengan *conventional commits*.

Gunakan dokumen ini bersama dengan `docs/PRD.md` sebagai acuan utama dalam membangun sistem CentroAbsen.
