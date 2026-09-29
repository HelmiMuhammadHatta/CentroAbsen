# Panduan Deployment Produksi

## 1. Arsitektur Docker Compose (Production)
Jalankan file `docker-compose.prod.yml`.
Ini memuat:
- Database MariaDB 11.4 LTS pada *Private Network*.
- Caddy Server (Reverse Proxy + Auto HTTPS via Let's Encrypt).
- Web (Next.js Multi-stage build + node_env production).
- API (Express TS yang di-*compile* menggunakan Node user *non-root*).

## 2. Skrip Backup Harian (Cron)
```bash
# Backup Database
docker exec centroabsen-db mariadb-dump -u root -p"$DB_ROOT_PASSWORD" centroabsen_prod > /backups/db_$(date +%Y%m%d).sql

# Backup Storage Foto
tar -czvf /backups/uploads_$(date +%Y%m%d).tar.gz /path/to/host/uploads
```

## 3. Estimasi Penyimpanan (Kapasitas Disk)
- Karyawan: 100 orang.
- Absen per hari: 2 kali (masuk & keluar).
- Estimasi foto: ~200 KB.
- Penggunaan harian: 100 * 2 * 200 KB = **40 MB/hari**.
- Penggunaan tahunan (250 hari kerja): 40 MB * 250 = **10 GB/tahun**.
Disarankan menyediakan disk minimal **30 GB** untuk ruang *database*, OS, dan cadangan foto selama 2 tahun sesuai aturan retensi default HR.

## 4. Migrasi Database Produksi
Gunakan *command* berikut sebelum menaikkan container aplikasi:
`docker exec -it centroabsen-api pnpm prisma migrate deploy`
