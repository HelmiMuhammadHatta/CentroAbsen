import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

export function initAttendanceJob() {
  // Jalan setiap hari jam 23:55 WIB
  cron.schedule('55 23 * * *', async () => {
    try {
      // 1. Dapatkan Lock (Mencegah job berjalan ganda)
      const lockRes: any = await prisma.$queryRaw`SELECT GET_LOCK('centroabsen_daily_job', 10) as lock_status`;
      if (lockRes[0].lock_status !== 1) {
        console.log('Daily job sedang berjalan di instansi lain, melewatkan...');
        return;
      }

      console.log('Memulai daily attendance job...');
      const todayStr = DateTime.now().setZone('Asia/Jakarta').toISODate();
      const workDate = new Date(`${todayStr}T00:00:00Z`);

      // Cek apakah hari ini libur nasional atau weekend
      const isWeekend = DateTime.now().setZone('Asia/Jakarta').weekday >= 6;
      const isHoliday = await prisma.holiday.findUnique({ where: { date: workDate } });
      const isWorkDay = !isWeekend && !isHoliday;

      const users = await prisma.user.findMany({ where: { is_active: true } });

      for (const user of users) {
        const checkIn = await prisma.attendance.findFirst({
          where: { user_id: user.id, work_date: workDate, type: 'CheckIn' }
        });
        const checkOut = await prisma.attendance.findFirst({
          where: { user_id: user.id, work_date: workDate, type: 'CheckOut' }
        });

        if (checkIn && !checkOut) {
          // Buat flag "Belum Absen Keluar" untuk checkIn tersebut
          await prisma.attendanceFlag.create({
            data: { attendance_id: checkIn.id, flag: 'belum_absen_keluar' }
          });
        }

        if (isWorkDay && !checkIn) {
          // Pastikan tidak sedang cuti
          const onLeave = await prisma.leaveRequest.findFirst({
            where: { user_id: user.id, status: 'Approved', start_date: { lte: workDate }, end_date: { gte: workDate } }
          });

          if (!onLeave) {
            // Rekap "Tidak Hadir" - di CentroAbsen tidak menyimpan record Attendance "Tidak Hadir", melainkan saat reporting
            // namun PRD: "bentuk rekap "Tidak Hadir" untuk hari kerja tanpa absensi"
            // Disimpan sebagai log atau secara dinamis pada saat GET /history.
            // Lebih aman untuk membuat fungsi rekapitulasi saat read query (history).
          }
        }
      }

      // Lepas lock
      await prisma.$queryRaw`SELECT RELEASE_LOCK('centroabsen_daily_job')`;
      console.log('Daily attendance job selesai.');
    } catch (e) {
      console.error('Error on daily attendance job:', e);
      // pastikan release lock walau error
      try {
        await prisma.$queryRaw`SELECT RELEASE_LOCK('centroabsen_daily_job')`;
      } catch (err) {}
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Jakarta'
  });
}
