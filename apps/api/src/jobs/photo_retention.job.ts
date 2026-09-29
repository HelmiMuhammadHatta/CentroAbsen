import { prisma } from '../utils/prisma';
import cron from 'node-cron';
import { DateTime } from 'luxon';
import path from 'path';
import fs from 'fs/promises';

export function initPhotoRetentionJob() {
  // Jalan setiap hari Minggu jam 02:00 pagi
  cron.schedule('0 2 * * 0', async () => {
    try {
      const lockRes: any = await prisma.$queryRaw`SELECT GET_LOCK('centroabsen_photo_retention_job', 10) as lock_status`;
      if (lockRes[0].lock_status !== 1) {
        console.log('Photo retention job sedang berjalan di instansi lain, melewatkan...');
        return;
      }

      const isEnabledSetting = await prisma.appSetting.findUnique({ where: { key: 'photo_retention_enabled' } });
      if (!isEnabledSetting || isEnabledSetting.value !== 'true') {
        console.log('Pembersihan foto dinonaktifkan (default). Silakan aktifkan via pengaturan HR.');
        await prisma.$queryRaw`SELECT RELEASE_LOCK('centroabsen_photo_retention_job')`;
        return;
      }

      const monthsSetting = await prisma.appSetting.findUnique({ where: { key: 'photo_retention_months' } });
      const months = monthsSetting ? parseInt(monthsSetting.value) : 12;

      console.log(`Memulai pembersihan foto yang lebih lama dari ${months} bulan...`);
      
      const thresholdDate = DateTime.now().setZone('Asia/Jakarta').minus({ months }).toJSDate();

      const oldAttendances = await prisma.attendance.findMany({
        where: {
          created_at: { lt: thresholdDate },
          photo_path: { not: '' } // assuming empty means no photo or already deleted
        }
      });

      let deletedCount = 0;
      for (const att of oldAttendances) {
        if (att.photo_path) {
          const filePath = path.join(process.cwd(), 'uploads', att.photo_path);
          try {
            await fs.unlink(filePath);
            deletedCount++;
          } catch (e: any) {
            if (e.code !== 'ENOENT') {
              console.error(`Gagal menghapus foto ${filePath}:`, e.message);
            }
          }
          // Set photo_path ke string kosong
          await prisma.attendance.update({
            where: { id: att.id },
            data: { photo_path: '' }
          });
        }
      }

      console.log(`Selesai menghapus ${deletedCount} foto lama.`);
      await prisma.$queryRaw`SELECT RELEASE_LOCK('centroabsen_photo_retention_job')`;
    } catch (e) {
      console.error('Error on photo retention job:', e);
      try {
        await prisma.$queryRaw`SELECT RELEASE_LOCK('centroabsen_photo_retention_job')`;
      } catch (err) {}
    }
  });
}
