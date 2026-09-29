import { prisma } from '../utils/prisma';
import { PrismaClient, RequestStatus } from '@prisma/client';
import { ApprovalService } from './approval.service';
import { DateTime } from 'luxon';



export class LeaveService {
  
  static async calculateWorkDays(startDate: string, endDate: string): Promise<number> {
    const start = DateTime.fromISO(startDate).setZone('Asia/Jakarta');
    const end = DateTime.fromISO(endDate).setZone('Asia/Jakarta');
    
    if (end < start) throw new Error('Tanggal akhir harus setelah tanggal mulai');

    let count = 0;
    let curr = start;

    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: start.toJSDate(), lte: end.toJSDate() } }
    });
    const holidayDates = new Set(holidays.map(h => DateTime.fromJSDate(h.date).toISODate()));

    while (curr <= end) {
      if (curr.weekday < 6 && !holidayDates.has(curr.toISODate())) {
        count++;
      }
      curr = curr.plus({ days: 1 });
    }

    return count;
  }

  static async submitLeaveRequest(userId: string, leaveTypeId: string, startDate: string, endDate: string, reason: string, attachmentPaths?: string[]) {
    return await prisma.$transaction(async (tx) => {
      const type = await tx.leaveType.findUnique({ where: { id: leaveTypeId } });
      if (!type || !type.is_active) throw new Error('Jenis cuti tidak valid');
      
      if (type.requires_attachment && (!attachmentPaths || attachmentPaths.length === 0)) {
        throw new Error('Cuti ini wajib melampirkan bukti');
      }

      // Hitung hari kerja
      const totalDays = await this.calculateWorkDays(startDate, endDate);
      if (totalDays === 0) throw new Error('Tidak ada hari kerja dalam rentang tanggal tersebut');

      const start = new Date(startDate);
      // Validasi past date
      if (start < new Date() && type.name !== 'Cuti Sakit') {
         // Harusnya pengecekan luxon secara detil (timezone), dibikin sederhana
         throw new Error('Hanya cuti sakit yang bisa diajukan untuk tanggal lampau (maks. konfigurasi)');
      }

      // Cek bentrok cuti
      const overlapping = await tx.leaveRequest.findFirst({
        where: {
          user_id: userId,
          status: { in: [RequestStatus.Pending, RequestStatus.Approved] },
          start_date: { lte: new Date(endDate) },
          end_date: { gte: new Date(startDate) }
        }
      });

      if (overlapping) throw new Error('Tanggal cuti bertabrakan dengan pengajuan lain');

      // Cek Saldo (atomic cek nanti di approval, tapi cek awal)
      const balance = await tx.leaveBalance.findUnique({
        where: {
          user_id_leave_type_id_year: {
            user_id: userId,
            leave_type_id: leaveTypeId,
            year: start.getFullYear()
          }
        }
      });

      if (type.annual_quota_days > 0) {
        if (!balance || balance.quota < totalDays) {
          throw new Error(`Saldo cuti tidak mencukupi. Saldo saat ini: ${balance?.quota || 0}`);
        }
      }

      // Buat pengajuan
      const request = await tx.leaveRequest.create({
        data: {
          user_id: userId,
          leave_type_id: leaveTypeId,
          start_date: start,
          end_date: new Date(endDate),
          total_work_days: totalDays,
          reason,
          status: RequestStatus.Pending
        }
      });

      // Simpan lampiran jika ada
      if (attachmentPaths && attachmentPaths.length > 0) {
        await tx.requestAttachment.createMany({
          data: attachmentPaths.map(p => ({
            request_type: 'Leave',
            request_id: request.id,
            file_path: p,
            original_name: p.split('/').pop() || 'lampiran',
            content_type: 'application/octet-stream',
            size_bytes: 0 // Simplifikasi
          }))
        });
      }

      // Setup Approval Engine
      await ApprovalService.setupApprovalSteps(tx, 'Leave', request.id, userId, type.requires_hr_approval, false);

      return request;
    });
  }

  static async cancelLeaveRequest(userId: string, requestId: string, isHrOrAdmin: boolean) {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.findUnique({ where: { id: requestId } });
      if (!request) throw new Error('Pengajuan cuti tidak ditemukan');

      if (!isHrOrAdmin && request.user_id !== userId) {
        throw new Error('Akses ditolak');
      }

      if (!isHrOrAdmin && request.status !== RequestStatus.Pending) {
        throw new Error('Hanya dapat membatalkan pengajuan yang masih berstatus Pending');
      }

      if (request.status === RequestStatus.Approved) {
        if (!isHrOrAdmin) {
          throw new Error('Pengajuan yang sudah disetujui hanya dapat dibatalkan oleh HR / Admin');
        }

        // Refund balance
        await tx.leaveBalance.updateMany({
          where: {
            user_id: request.user_id,
            leave_type_id: request.leave_type_id,
            year: request.start_date.getFullYear()
          },
          data: {
            used: { decrement: request.total_work_days },
            quota: { increment: request.total_work_days }
          }
        });
      }

      return await tx.leaveRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.Rejected, cancelled_at: new Date() }
      });
    });
  }
}
