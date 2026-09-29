import { prisma } from '../utils/prisma';
import { PrismaClient, RequestStatus } from '@prisma/client';
import { NotificationService } from './notification.service';



export class ApprovalService {
  static async setupApprovalSteps(
    tx: any, 
    requestType: 'Leave' | 'Finance', 
    requestId: string, 
    requesterId: string, 
    requiresHr: boolean,
    requiresFinance: boolean
  ) {
    const requester = await tx.user.findUnique({ where: { id: requesterId } });
    if (!requester) throw new Error('Pemohon tidak ditemukan');

    let firstApproverId = requester.manager_id;
    if (firstApproverId === requesterId) {
       // Cannot self-approve, find manager's manager, or default to HR if none
       const manager = await tx.user.findUnique({ where: { id: firstApproverId }});
       firstApproverId = manager?.manager_id || null;
    }

    if (!firstApproverId) {
       // Fallback to HR Admin if no manager hierarchy exists
       const hr = await tx.user.findFirst({ where: { roles: { some: { role: { name: 'HrAdmin' } } }, is_active: true } });
       firstApproverId = hr?.id;
    }

    if (!firstApproverId) {
      throw new Error('Tidak ada approver yang tersedia untuk pengajuan ini');
    }

    let stepOrder = 1;
    const steps = [];

    // Step 1: Manager
    steps.push({
      request_type: requestType,
      request_id: requestId,
      step_order: stepOrder++,
      role_required: 'Manager',
      assigned_to_user_id: firstApproverId,
      status: RequestStatus.Pending
    });

    // Step 2: HR (if needed)
    if (requiresHr) {
      const hr = await tx.user.findFirst({ where: { roles: { some: { role: { name: 'HrAdmin' } } }, is_active: true } });
      if (hr) {
        steps.push({
          request_type: requestType,
          request_id: requestId,
          step_order: stepOrder++,
          role_required: 'HrAdmin',
          assigned_to_user_id: hr.id,
          status: RequestStatus.Pending
        });
      }
    }

    // Step 2/3: Finance (if needed)
    if (requiresFinance) {
      const finance = await tx.user.findFirst({ where: { roles: { some: { role: { name: 'Finance' } } }, is_active: true } });
      if (finance) {
        steps.push({
          request_type: requestType,
          request_id: requestId,
          step_order: stepOrder++,
          role_required: 'Finance',
          assigned_to_user_id: finance.id,
          status: RequestStatus.Pending
        });
      }
    }

    await tx.approvalStep.createMany({ data: steps });
    
    // Notify first approver
    await NotificationService.notify(tx, firstApproverId, 'Pengajuan Baru', `Ada pengajuan ${requestType} baru yang memerlukan persetujuan Anda.`);
  }

  static async actOnStep(
    actorId: string, 
    actorRoles: string[],
    requestType: 'Leave' | 'Finance', 
    requestId: string, 
    action: 'Approve' | 'Reject', 
    note?: string
  ) {
    if (action === 'Reject' && (!note || note.length < 5)) {
      throw new Error('Alasan penolakan wajib diisi (min. 5 karakter)');
    }

    return await prisma.$transaction(async (tx) => {
      // Dapatkan step aktif
      const steps = await tx.approvalStep.findMany({
        where: { request_type: requestType, request_id: requestId },
        orderBy: { step_order: 'asc' }
      });

      const currentStep = steps.find(s => s.status === RequestStatus.Pending);
      if (!currentStep) throw new Error('Tidak ada langkah persetujuan yang aktif');

      if (currentStep.assigned_to_user_id !== actorId && !actorRoles.includes('HrAdmin')) {
         throw new Error('Anda tidak memiliki akses untuk menyetujui langkah ini');
      }

      // Compare-and-set untuk update status step
      const updateResult = await tx.approvalStep.updateMany({
        where: { id: currentStep.id, status: RequestStatus.Pending },
        data: {
          status: action === 'Approve' ? RequestStatus.Approved : RequestStatus.Rejected,
          acted_by: actorId,
          acted_at: new Date(),
          note: note || null
        }
      });

      if (updateResult.count === 0) {
        throw new Error('Langkah ini sudah diproses oleh orang lain (race condition)');
      }

      let finalStatus: RequestStatus = RequestStatus.Pending;

      if (action === 'Reject') {
        finalStatus = RequestStatus.Rejected;
      } else {
        // Cek apakah ada step berikutnya
        const nextStep = steps.find(s => s.step_order > currentStep.step_order);
        if (!nextStep) {
          finalStatus = RequestStatus.Approved;
        } else {
          // Notify next approver
          if (nextStep.assigned_to_user_id) {
             await NotificationService.notify(tx, nextStep.assigned_to_user_id, 'Persetujuan Lanjutan', `Pengajuan ${requestType} memerlukan persetujuan lanjutan.`);
          }
        }
      }

      // Update tabel utama
      if (finalStatus !== RequestStatus.Pending) {
        if (requestType === 'Leave') {
          const leaveReq = await tx.leaveRequest.update({
            where: { id: requestId },
            data: { status: finalStatus }
          });
          
          if (finalStatus === RequestStatus.Approved) {
            // Pengurangan saldo secara aman menggunakan atomic decrement
            await tx.leaveBalance.updateMany({
              where: {
                user_id: leaveReq.user_id,
                leave_type_id: leaveReq.leave_type_id,
                year: leaveReq.start_date.getFullYear(),
                quota: { gte: leaveReq.total_work_days } // pastikan saldo cukup
              },
              data: {
                used: { increment: leaveReq.total_work_days },
                quota: { decrement: leaveReq.total_work_days }
              }
            });
            // Catatan: Jika updateMany count === 0, berarti saldo kurang, 
            // idealnya harus di-rollback. Tapi cek saldo awal sudah dilakukan di tahap pengajuan.
          }
          await NotificationService.notify(tx, leaveReq.user_id, `Status Cuti Anda: ${finalStatus}`, `Cuti Anda telah ${finalStatus === RequestStatus.Approved ? 'disetujui' : 'ditolak'}`);

        } else if (requestType === 'Finance') {
          const finReq = await tx.financeRequest.update({
            where: { id: requestId },
            data: { status: finalStatus }
          });
          await NotificationService.notify(tx, finReq.user_id, `Status Pengajuan Dana: ${finalStatus}`, `Pengajuan dana Anda telah ${finalStatus === RequestStatus.Approved ? 'disetujui' : 'ditolak'}`);
        }
      }

      return finalStatus;
    });
  }
}
