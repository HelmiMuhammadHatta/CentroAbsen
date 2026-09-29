# CentroAbsen

Aplikasi absensi karyawan berbasis PWA.

## Prasyarat
- Node.js LTS (>= 20)
- pnpm
- Docker & Docker Compose

## Cara Menjalankan

1. Start database dan infrastructure:
   ```bash
   cd infra
   docker-compose up -d
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Setup database dan seeding (dari folder `apps/api`):
   ```bash
   cd apps/api
   npx prisma generate
   npx prisma db push
   # atau pnpm exec prisma migrate dev
   ```
4. Jalankan aplikasi (dev mode):
   ```bash
   pnpm dev
   ```

Aplikasi backend tersedia di port 4000 (http://localhost:4000/health) dan web di port 3000.
