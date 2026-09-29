import { PrismaClient, WorkMode, AttendanceType, Attendance } from '@prisma/client';
import { DateTime } from 'luxon';
import { calculateHaversineDistance } from '../utils/haversine';
import { processAttendancePhoto } from '../utils/image';

const prisma = new PrismaClient();
const TZ = 'Asia/Jakarta';

export class AttendanceService {
  static async submitAttendance(data: {
    userId: string;
    type: AttendanceType;
    clientCapturedAt: string; // ISO string
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    workMode: WorkMode;
    idempotencyKey: string;
    photoBuffer: Buffer;
  }) {
    // 1. Akurasi GPS
    if (data.accuracyMeters > 100) {
      throw new Error('Akurasi GPS lebih dari 100 meter, silakan coba lagi');
    }

    const serverTime = DateTime.now().setZone(TZ);
    const clientTime = DateTime.fromISO(data.clientCapturedAt).setZone(TZ);
    const workDateStr = serverTime.toISODate(); // YYYY-MM-DD
    const workDate = new Date(`${workDateStr}T00:00:00Z`); // Disimpan UTC di DB tapi secara konsep ini tanggal di Jakarta

    const flags: string[] = [];

    // 2. Selisih waktu perangkat
    if (Math.abs(serverTime.diff(clientTime, 'minutes').minutes) > 2) {
      flags.push('jam_perangkat_tidak_sinkron');
    }

    if (data.accuracyMeters >= 50 && data.accuracyMeters <= 100) {
      flags.push('akurasi_rendah');
    }

    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      include: { primary_work_location: true }
    });

    if (!user) throw new Error('User tidak ditemukan');

    let distanceFromOffice: number | null = null;
    let workLocationId: string | null = null;

    // 3. Pengecekan Lokasi Kerja & Mode
    if (data.workMode === WorkMode.Office) {
      if (!user.primary_work_location) {
        throw new Error('Tidak ada lokasi kerja utama yang diatur');
      }
      workLocationId = user.primary_work_location.id;
      
      const loc = user.primary_work_location;
      distanceFromOffice = calculateHaversineDistance(
        data.latitude, data.longitude, 
        loc.latitude.toNumber(), loc.longitude.toNumber()
      );

      if (distanceFromOffice > loc.radius_meters) {
        throw new Error(`Anda berjarak ${distanceFromOffice} m dari area ${loc.name}. (Batas: ${loc.radius_meters} m)`);
      }
    } else {
      if (user.work_arrangement === 'Office') {
        flags.push('mode_kerja_tidak_sesuai');
      }
    }

    // 4. Pengecekan Hari Libur & Cuti
    const holiday = await prisma.holiday.findUnique({ where: { date: workDate } });
    const isWeekend = serverTime.weekday === 6 || serverTime.weekday === 7;
    if (holiday || isWeekend) {
      flags.push('hari_non_kerja');
    }

    const leave = await prisma.leaveRequest.findFirst({
      where: { user_id: user.id, status: 'Approved', start_date: { lte: workDate }, end_date: { gte: workDate } }
    });
    if (leave) {
      flags.push('sedang_cuti');
    }

    // 5. Pengecekan Status Tepat Waktu / Terlambat
    let statusLabel = '';
    let statusMinutes = 0;
    
    if (user.primary_work_location) {
      const loc = user.primary_work_location;
      if (data.type === AttendanceType.CheckIn) {
        const [startH, startM] = loc.work_start.split(':').map(Number);
        const startTime = serverTime.set({ hour: startH, minute: startM, second: 0 });
        const allowedStart = startTime.plus({ minutes: loc.late_tolerance_minutes });
        
        if (serverTime > allowedStart) {
          statusLabel = 'Terlambat';
          statusMinutes = Math.floor(serverTime.diff(startTime, 'minutes').minutes);
        } else {
          statusLabel = 'Tepat Waktu';
        }
      } else {
        // CheckOut
        const checkIn = await prisma.attendance.findFirst({
          where: { user_id: user.id, work_date: workDate, type: AttendanceType.CheckIn }
        });
        if (!checkIn) {
          throw new Error('Harus Check In terlebih dahulu');
        }

        const [endH, endM] = loc.work_end.split(':').map(Number);
        const endTime = serverTime.set({ hour: endH, minute: endM, second: 0 });
        
        if (serverTime < endTime) {
          statusLabel = 'Pulang Cepat';
          statusMinutes = Math.floor(endTime.diff(serverTime, 'minutes').minutes);
        } else {
          statusLabel = 'Normal';
        }
      }
    } else {
      statusLabel = data.type === AttendanceType.CheckIn ? 'Tepat Waktu' : 'Normal';
    }

    // 6. Proses Foto
    const photoPath = await processAttendancePhoto(data.photoBuffer);

    // 7. Simpan Absensi
    try {
      const attendance = await prisma.attendance.create({
        data: {
          user_id: user.id,
          type: data.type,
          work_date: workDate,
          server_time_utc: serverTime.toJSDate(),
          client_captured_at: clientTime.toJSDate(),
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy_meters: data.accuracyMeters,
          distance_from_office_meters: distanceFromOffice,
          work_location_id: workLocationId,
          work_mode: data.workMode,
          photo_path: photoPath,
          status: statusLabel,
          status_minutes: statusMinutes,
          idempotency_key: data.idempotencyKey,
        }
      });

      if (flags.length > 0) {
        await prisma.attendanceFlag.createMany({
          data: flags.map(f => ({ attendance_id: attendance.id, flag: f }))
        });
      }

      return attendance;
    } catch (e: any) {
      if (e.code === 'P2002') {
        // Cek apakah karena idempotency key
        const existingIdemp = await prisma.attendance.findUnique({ where: { idempotency_key: data.idempotencyKey } });
        if (existingIdemp) return existingIdemp;
        
        throw new Error('Anda sudah melakukan ' + data.type + ' hari ini');
      }
      throw e;
    }
  }
}
