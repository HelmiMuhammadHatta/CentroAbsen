import { Request, Response } from 'express';
import { AttendanceService } from '../services/attendance.service';
import { AttendanceType, WorkMode } from '@prisma/client';
import path from 'path';
import fs from 'fs';

export class AttendanceController {
  static async submit(req: Request, res: Response) {
    try {
      // asumsikan middleware auth menyuntikkan user ke req.user
      const userId = (req as any).user?.id || req.body.userId; // fallback untuk test
      const idempotencyKey = req.headers['idempotency-key'] as string;

      if (!idempotencyKey) {
        return res.status(400).json({ error: 'Header Idempotency-Key wajib disertakan' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Foto wajib disertakan' });
      }

      const attendance = await AttendanceService.submitAttendance({
        userId,
        type: req.body.type as AttendanceType,
        clientCapturedAt: req.body.clientCapturedAt,
        latitude: parseFloat(req.body.latitude),
        longitude: parseFloat(req.body.longitude),
        accuracyMeters: parseFloat(req.body.accuracyMeters),
        workMode: req.body.workMode as WorkMode,
        idempotencyKey,
        photoBuffer: req.file.buffer
      });

      res.status(201).json({ message: 'Absensi berhasil dicatat', data: attendance });
    } catch (error: any) {
      res.status(error.message.includes('Anda sudah melakukan') ? 409 : 400).json({ error: error.message });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;
      let startDate = req.query.startDate as string;
      let endDate = req.query.endDate as string;
      const monthStr = req.query.month as string;
      const employeeId = req.query.employeeId as string;
      const statusFilter = req.query.status as string;
      const userId = (req as any).user?.id;

      const { prisma } = require('../utils/prisma');
      let where: any = {};

      if (employeeId) {
        const targetUser = await prisma.user.findFirst({
          where: { OR: [{ id: employeeId }, { nik: employeeId }] }
        });
        if (targetUser) where.user_id = targetUser.id;
      } else if (userId) {
        where.user_id = userId;
      }

      if (monthStr) {
        // e.g., "2026-09"
        const [year, m] = monthStr.split('-');
        startDate = `${year}-${m}-01`;
        const nextMonthDate = new Date(Number(year), Number(m), 0); // last day of month
        endDate = nextMonthDate.toISOString().split('T')[0];
      }

      if (startDate && endDate) {
        where.work_date = {
          gte: new Date(`${startDate}T00:00:00Z`),
          lte: new Date(`${endDate}T23:59:59Z`)
        };
      }

      const attendances = await prisma.attendance.findMany({
        where,
        include: {
          user: { select: { full_name: true, nik: true } },
          work_location: { select: { name: true } },
          flags: true
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      // Group CheckIn and CheckOut per user per day
      const groupedMap = new Map<string, { checkIn?: any; checkOut?: any }>();

      for (const att of attendances) {
        const dateKey = att.work_date ? new Date(att.work_date).toISOString().split('T')[0] : new Date(att.created_at).toISOString().split('T')[0];
        const key = `${att.user_id}_${dateKey}`;
        if (!groupedMap.has(key)) {
          groupedMap.set(key, {});
        }
        const group = groupedMap.get(key)!;
        if (att.type === 'CheckIn') {
          group.checkIn = att;
        } else if (att.type === 'CheckOut') {
          group.checkOut = att;
        }
      }

      const formattedData = Array.from(groupedMap.values()).map(({ checkIn, checkOut }) => {
        const primary = checkIn || checkOut;
        const mode = primary.work_mode;
        const photo = checkIn?.photo_path || checkOut?.photo_path;

        return {
          id: primary.id,
          employeeName: primary.user?.full_name || 'Karyawan',
          clockIn: checkIn ? (checkIn.client_captured_at || checkIn.server_time_utc || checkIn.created_at) : null,
          clockOut: checkOut ? (checkOut.client_captured_at || checkOut.server_time_utc || checkOut.created_at) : null,
          locationName: primary.work_location?.name || (mode === 'Home' ? 'WFH (Rumah)' : (mode === 'Anywhere' ? 'Tugas Luar / Remote' : 'Kantor Utama')),
          photoUrl: photo ? `/api/v1/attendances/${primary.id}/photo` : null,
          status: checkIn?.status || checkOut?.status || 'Tepat Waktu',
          workMode: mode,
          workDate: primary.work_date,
          flags: primary.flags?.map((f: any) => f.flag) || []
        };
      });

      let finalData = formattedData;
      if (statusFilter) {
        finalData = finalData.filter(d => d.status.toLowerCase() === statusFilter.toLowerCase());
      }

      // Hitung ringkasan
      const totalHadir = formattedData.length;
      const totalTerlambat = formattedData.filter(d => d.status === 'Terlambat').length;
      const totalBelumAbsenKeluar = formattedData.filter(d => !d.clockOut).length;
      
      // Hitung tidak hadir (hari kerja tanpa absen)
      let totalTidakHadir = 0;
      if (startDate && endDate) {
        const start = new Date(`${startDate}T00:00:00Z`);
        const end = new Date(`${endDate}T23:59:59Z`);
        let currentDate = new Date(start);
        const presentDates = new Set(formattedData.map(d => new Date(d.workDate).toISOString().split('T')[0]));
        
        while (currentDate <= end && currentDate <= new Date()) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
          // Note: Ideally query holidays and leaves here. For simplicity, just check weekends and presentDates.
          if (!isWeekend && !presentDates.has(dateStr)) {
            totalTidakHadir++;
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      res.json({ 
        data: finalData, 
        total: finalData.length,
        summary: {
          hadir: totalHadir,
          terlambat: totalTerlambat,
          belum_absen_keluar: totalBelumAbsenKeluar,
          tidak_hadir: totalTidakHadir
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async getPhoto(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const currentUser = (req as any).user;
      if (!currentUser) return res.status(401).json({ error: 'Tidak terotorisasi' });

      const { prisma } = require('../utils/prisma');
      const attendance = await prisma.attendance.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!attendance || !attendance.photo_path) {
        return res.status(404).json({ error: 'Foto tidak ditemukan' });
      }

      // Authorization check: Owner, Direct Manager, or Admin/HR role/permission
      const isOwner = attendance.user_id === currentUser.id;
      const isManager = attendance.user?.manager_id === currentUser.id;
      const hasPermission = currentUser.permissions?.includes('attendance.read') || currentUser.role === 'Admin' || currentUser.role === 'HR';

      if (!isOwner && !isManager && !hasPermission) {
        return res.status(403).json({ error: 'Akses ditolak: Anda tidak memiliki wewenang melihat foto ini' });
      }

      const filePath = path.join(process.cwd(), 'uploads', attendance.photo_path);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File foto tidak ditemukan di server' });
      }

      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      res.setHeader('Content-Type', 'image/jpeg');

      res.sendFile(filePath);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async getSummary(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;
      const month = parseInt(req.query.month as string);
      const year = parseInt(req.query.year as string);

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const { prisma } = require('../utils/prisma');
      const reqUserId = (req as any).user?.id;
      const user = await prisma.user.findFirst({
        where: { OR: [{ id: employeeId }, { nik: employeeId }, { id: reqUserId }] }
      });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const attendances = await prisma.attendance.findMany({
        where: {
          user_id: user.id,
          work_date: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const presentDays = new Set(attendances.map((a: any) => new Date(a.work_date).toISOString().split('T')[0])).size;

      res.json({
        data: {
          totalPresent: presentDays,
          totalLate: attendances.filter((a: any) => a.status === 'Terlambat').length,
          totalEarlyLeave: attendances.filter((a: any) => a.status === 'Pulang Cepat').length,
          totalAbsent: 0,
          totalLeave: 0,
          totalWorkingHours: presentDays * 8
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async getToday(req: Request, res: Response) {
    try {
      const { prisma } = require('../utils/prisma');
      const userId = (req as any).user.id;
      
      const serverTime = new Date();
      const workDateStr = new Date(serverTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })).toISOString().split('T')[0];
      const workDate = new Date(`${workDateStr}T00:00:00Z`);

      const attendances = await prisma.attendance.findMany({
        where: { user_id: userId, work_date: workDate },
        include: { work_location: true }
      });

      const checkIn = attendances.find((a: any) => a.type === 'CheckIn');
      const checkOut = attendances.find((a: any) => a.type === 'CheckOut');

      let allowedAction = 'CheckIn';
      if (checkIn && !checkOut) allowedAction = 'CheckOut';
      if (checkIn && checkOut) allowedAction = 'none';

      res.json({
        data: {
          checkIn: checkIn ? checkIn.server_time_utc : null,
          checkOut: checkOut ? checkOut.server_time_utc : null,
          status: checkIn?.status || 'Belum Absen',
          location: checkIn?.work_location?.name || null,
          allowedAction
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async getDetail(req: Request, res: Response) {
    try {
      const { prisma } = require('../utils/prisma');
      const { id } = req.params;

      const attendance = await prisma.attendance.findUnique({
        where: { id },
        include: {
          user: { select: { full_name: true, nik: true } },
          work_location: { select: { name: true } },
          flags: true
        }
      });

      if (!attendance) return res.status(404).json({ error: 'Absensi tidak ditemukan' });

      // Otorisasi: hanya pemilik atau manajer/admin/hr yang bisa lihat
      const currentUser = (req as any).user;
      const isOwner = attendance.user_id === currentUser.id;
      const isManager = attendance.user?.manager_id === currentUser.id;
      const hasPermission = currentUser.permissions?.includes('attendance.read') || currentUser.role === 'Admin' || currentUser.role === 'HR';

      if (!isOwner && !isManager && !hasPermission) {
        return res.status(403).json({ error: 'Akses ditolak' });
      }

      res.json({ data: attendance });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async reviewFlag(req: Request, res: Response) {
    try {
      const reviewerUserId = (req as any).user.id;
      const { flagId } = req.params;
      const { note } = req.body;

      if (!note || note.trim().length < 3) {
        return res.status(400).json({ error: 'Catatan peninjauan wajib diisi (min. 3 karakter)' });
      }

      const updatedFlag = await AttendanceService.reviewFlag(reviewerUserId, flagId, note);
      res.json({ message: 'Flag absensi berhasil ditinjau', data: updatedFlag });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }
}
