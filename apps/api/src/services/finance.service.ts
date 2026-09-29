import { prisma } from '../utils/prisma';
import { FinanceRequestKind } from '@prisma/client';
import { NotificationService } from './notification.service';

export class FinanceService {
  // Utility: get CEO user ID from app_settings or first active Executive user
  static async getCeoUserId(tx?: any): Promise<string | null> {
    const db = tx || prisma;
    const setting = await db.appSetting.findUnique({ where: { key: 'finance_ceo_user_id' } });
    if (setting?.value) return setting.value;

    const ceoUser = await db.user.findFirst({
      where: {
        is_active: true,
        roles: {
          some: {
            role: {
              name: 'Executive'
            }
          }
        }
      }
    });
    return ceoUser?.id || null;
  }

  // Utility: get CEO threshold from app_settings (default 0)
  static async getCeoThresholdIdr(tx?: any): Promise<number> {
    const db = tx || prisma;
    const setting = await db.appSetting.findUnique({ where: { key: 'finance_ceo_threshold_idr' } });
    if (setting?.value) {
      const val = parseFloat(setting.value);
      return isNaN(val) ? 0 : val;
    }
    return 0;
  }

  // Utility: check if user has a specific permission
  static async userHasPermission(userId: string, permissionName: string, tx?: any): Promise<boolean> {
    const db = tx || prisma;
    const count = await db.userRole.count({
      where: {
        user_id: userId,
        role: {
          permissions: {
            some: {
              permission: {
                name: permissionName
              }
            }
          }
        }
      }
    });
    return count > 0;
  }

  // 1. Submit Finance Request (Alur Baru: Atasan -> CEO -> Keuangan)
  static async submitFinanceRequest(
    userId: string,
    kind: FinanceRequestKind,
    category: string,
    amountIdr: number,
    description: string,
    attachmentPaths: string[],
    customApproverIds?: string[]
  ) {
    if (description.length < 10) throw new Error('Keterangan minimal 10 karakter');
    if (amountIdr <= 0) throw new Error('Nominal harus lebih dari 0');

    if (kind === FinanceRequestKind.Reimbursement && attachmentPaths.length === 0) {
      throw new Error('Reimbursement wajib melampirkan bukti (struk/nota)');
    }
    if (kind === FinanceRequestKind.Purchase && attachmentPaths.length === 0) {
      if (!description.includes('http')) {
        throw new Error('Pembelian wajib melampirkan bukti penawaran atau tautan di keterangan');
      }
    }

    return await prisma.$transaction(async (tx) => {
      const requester = await tx.user.findUnique({ where: { id: userId } });
      if (!requester) throw new Error('Pemohon tidak ditemukan');

      const ceoUserId = await FinanceService.getCeoUserId(tx);
      const isRequesterCeo = (ceoUserId && userId === ceoUserId) || (await FinanceService.userHasPermission(userId, 'finance.approve.executive', tx));
      const thresholdIdr = await FinanceService.getCeoThresholdIdr(tx);

      let initialStatus = 'Diajukan'; // "Diajukan" (menunggu Atasan)
      const isCeoSubmitted = isRequesterCeo;

      if (isRequesterCeo) {
        initialStatus = 'MenungguPencairan';
      }

      const request = await tx.financeRequest.create({
        data: {
          user_id: userId,
          kind,
          category,
          amount_idr: amountIdr,
          description,
          status: initialStatus,
          is_ceo_submitted: isCeoSubmitted
        }
      });

      // Save attachments
      if (attachmentPaths && attachmentPaths.length > 0) {
        await tx.requestAttachment.createMany({
          data: attachmentPaths.map(p => ({
            request_type: 'Finance',
            request_id: request.id,
            file_path: p,
            original_name: p.split('/').pop() || 'lampiran',
            content_type: 'application/octet-stream',
            size_bytes: 0
          }))
        });
      }

      // Setup 3-Step Approval Engine
      let managerId = requester.manager_id;
      if (managerId === userId) {
        const managerObj = await tx.user.findUnique({ where: { id: managerId } });
        managerId = managerObj?.manager_id || null;
      }

      const stepsData = [];
      let currentStepOrder = 1;

      // Step 1: Atasan
      let step1Status = 'Pending';
      let step1Note: string | null = null;

      if (customApproverIds && customApproverIds.length > 0) {
        for (const appId of customApproverIds) {
          if (!appId) continue;
          stepsData.push({
            request_type: 'Finance',
            request_id: request.id,
            step_order: currentStepOrder++,
            role_required: 'finance.approve.manager',
            assigned_to_user_id: appId,
            status: 'Pending',
            note: null
          });
        }
      } else {
        if (isRequesterCeo) {
          step1Status = 'Skipped';
          step1Note = 'Pemohon adalah CEO';
        } else if (!managerId || managerId === ceoUserId) {
          step1Status = 'Skipped';
          step1Note = managerId === ceoUserId ? 'Atasan adalah CEO' : 'Pemohon tidak memiliki atasan';
        }
        stepsData.push({
          request_type: 'Finance',
          request_id: request.id,
          step_order: currentStepOrder++,
          role_required: 'finance.approve.manager',
          assigned_to_user_id: managerId,
          status: step1Status as any,
          note: step1Note
        });
      }

      // Step 2: CEO
      let step2Status = 'Pending';
      let step2Note: string | null = null;

      if (isRequesterCeo) {
        step2Status = 'Skipped';
        step2Note = 'Pemohon adalah CEO';
      } else if (thresholdIdr > 0 && amountIdr < thresholdIdr) {
        step2Status = 'Skipped';
        step2Note = `Nominal di bawah ambang persetujuan CEO (Rp ${thresholdIdr.toLocaleString('id-ID')})`;
      }

      stepsData.push({
        request_type: 'Finance',
        request_id: request.id,
        step_order: currentStepOrder++,
        role_required: 'finance.approve.executive',
        assigned_to_user_id: ceoUserId,
        status: step2Status as any,
        note: step2Note
      });

      // Step 3: Pencairan (Keuangan)
      stepsData.push({
        request_type: 'Finance',
        request_id: request.id,
        step_order: currentStepOrder++,
        role_required: 'finance.disburse',
        assigned_to_user_id: null,
        status: 'Pending' as any,
        note: null
      });

      await tx.approvalStep.createMany({ data: stepsData });

      // Determine initial status based on skips
      if (!isRequesterCeo) {
        if (step1Status === 'Skipped') {
          if (step2Status === 'Skipped') {
            // Both 1 & 2 skipped -> MenungguPencairan
            await tx.financeRequest.update({
              where: { id: request.id },
              data: { status: 'MenungguPencairan' }
            });
            // Notify finance team
            await FinanceService.notifyFinanceTeam(tx, request.id, amountIdr);
          } else {
            // Step 1 skipped, Step 2 active -> MenungguCEO
            await tx.financeRequest.update({
              where: { id: request.id },
              data: { status: 'MenungguCEO' }
            });
            if (ceoUserId) {
              await NotificationService.notify(tx, ceoUserId, 'Pengajuan Keuangan Perlu Persetujuan', `Ada pengajuan ${kind} sebesar Rp ${amountIdr.toLocaleString('id-ID')} memerlukan persetujuan CEO.`);
            }
          }
        } else {
          // Step 1 active -> Diajukan
          if (managerId) {
            await NotificationService.notify(tx, managerId, 'Pengajuan Keuangan Perlu Persetujuan', `Bawahan Anda mengajukan ${kind} sebesar Rp ${amountIdr.toLocaleString('id-ID')}.`);
          }
        }
      } else {
        // CEO request -> notify Finance
        await FinanceService.notifyFinanceTeam(tx, request.id, amountIdr);
      }

      return request;
    });
  }

  // Utility to notify Finance Pool
  static async notifyFinanceTeam(tx: any, requestId: string, amountIdr: number) {
    const financeUsers = await tx.user.findMany({
      where: {
        is_active: true,
        roles: {
          some: {
            role: {
              permissions: {
                some: {
                  permission: {
                    name: 'finance.disburse'
                  }
                }
              }
            }
          }
        }
      }
    });

    for (const u of financeUsers) {
      await NotificationService.notify(tx, u.id, 'Pengajuan Keuangan Siap Dicairkan', `Pengajuan dana sebesar Rp ${amountIdr.toLocaleString('id-ID')} telah disetujui dan siap dicairkan.`);
    }
  }

  // 2. Process Approval Action (Approve / Reject) by Manager or CEO
  static async approveOrRejectStep(
    actorId: string,
    requestId: string,
    action: 'Approve' | 'Reject',
    note?: string
  ) {
    if (action === 'Reject' && (!note || note.trim().length < 5)) {
      throw new Error('Alasan penolakan wajib diisi (minimal 5 karakter)');
    }

    return await prisma.$transaction(async (tx) => {
      const request = await tx.financeRequest.findUnique({
        where: { id: requestId },
        include: { user: true }
      });
      if (!request) throw new Error('Pengajuan tidak ditemukan');

      const isSuperAdmin = await FinanceService.userHasPermission(actorId, 'employee.delete', tx); // or admin
      const isCeo = await FinanceService.userHasPermission(actorId, 'finance.approve.executive', tx);

      // Fetch steps
      const steps = await tx.approvalStep.findMany({
        where: { request_type: 'Finance', request_id: requestId },
        orderBy: { step_order: 'asc' }
      });

      const currentStep = steps.find(s => s.status === 'Pending');
      if (!currentStep) throw new Error('Tidak ada langkah persetujuan yang aktif');

      if (currentStep.step_order === 3) {
        throw new Error('Langkah pencairan harus menggunakan endpoint disburse');
      }

      // Check permission
      let isAuthorized = false;
      if (currentStep.step_order === 1) {
        isAuthorized = currentStep.assigned_to_user_id === actorId || isSuperAdmin;
      } else if (currentStep.step_order === 2) {
        isAuthorized = currentStep.assigned_to_user_id === actorId || isCeo || isSuperAdmin;
      }

      // SuperAdmin/HR cannot approve own request
      if (request.user_id === actorId) {
        throw new Error('Anda tidak boleh menyetujui pengajuan milik Anda sendiri');
      }

      if (!isAuthorized) {
        throw new Error('Anda tidak memiliki otoritas untuk menyetujui/menolak langkah ini');
      }

      // CAS Update step
      const updatedCount = await tx.approvalStep.updateMany({
        where: { id: currentStep.id, status: 'Pending' },
        data: {
          status: action === 'Approve' ? 'Approved' : 'Rejected',
          acted_by: actorId,
          acted_at: new Date(),
          note: note || null
        }
      });

      if (updatedCount.count === 0) {
        throw new Error('Langkah ini sudah diproses oleh orang lain');
      }

      if (action === 'Reject') {
        await tx.financeRequest.update({
          where: { id: requestId },
          data: { status: 'Ditolak' }
        });
        await NotificationService.notify(tx, request.user_id, 'Pengajuan Keuangan Ditolak', `Pengajuan ${request.kind} Anda ditolak. Alasan: ${note}`);
        return { status: 'Ditolak' };
      }

      // Action is Approve
      const nextStep = steps.find(s => s.step_order > currentStep.step_order && s.status === 'Pending');

      if (!nextStep || nextStep.step_order === 3) {
        // Advanced to Disbursement
        await tx.financeRequest.update({
          where: { id: requestId },
          data: { status: 'MenungguPencairan' }
        });
        await FinanceService.notifyFinanceTeam(tx, requestId, Number(request.amount_idr));
        await NotificationService.notify(tx, request.user_id, 'Pengajuan Disetujui', `Pengajuan ${request.kind} Anda telah disetujui dan menunggu pencairan oleh Keuangan.`);
        return { status: 'MenungguPencairan' };
      } else if (nextStep.step_order === 2) {
        // Advanced to CEO
        await tx.financeRequest.update({
          where: { id: requestId },
          data: { status: 'MenungguCEO' }
        });
        const ceoUserId = await FinanceService.getCeoUserId(tx);
        if (ceoUserId) {
          await NotificationService.notify(tx, ceoUserId, 'Pengajuan Keuangan Perlu Persetujuan CEO', `Pengajuan ${request.kind} sebesar Rp ${Number(request.amount_idr).toLocaleString('id-ID')} telah disetujui Atasan dan menunggu persetujuan CEO.`);
        }
        await NotificationService.notify(tx, request.user_id, 'Pengajuan Disetujui Atasan', `Pengajuan ${request.kind} Anda disetujui Atasan dan kini menunggu persetujuan CEO.`);
        return { status: 'MenungguCEO' };
      }

      return { status: request.status };
    });
  }

  // 3. Disburse Request (Keuangan)
  static async disburseRequest(
    actorId: string,
    requestId: string,
    method: string,
    referenceNo?: string,
    note?: string,
    proofFilePath?: string
  ) {
    if (!['Transfer', 'Tunai', 'Lainnya'].includes(method)) {
      throw new Error('Metode pencairan harus salah satu dari: Transfer, Tunai, Lainnya');
    }

    return await prisma.$transaction(async (tx) => {
      const request = await tx.financeRequest.findUnique({
        where: { id: requestId },
        include: { user: true }
      });
      if (!request) throw new Error('Pengajuan tidak ditemukan');

      if (request.status !== 'MenungguPencairan') {
        throw new Error(`Pengajuan tidak dalam status MenungguPencairan (Status saat ini: ${request.status})`);
      }

      // User cannot disburse their own request!
      if (request.user_id === actorId) {
        throw new Error('Pemohon tidak boleh mencairkan pengajuannya sendiri');
      }

      const hasDisbursePerm = await FinanceService.userHasPermission(actorId, 'finance.disburse', tx);
      const isSuperAdmin = await FinanceService.userHasPermission(actorId, 'employee.delete', tx);
      if (!hasDisbursePerm && !isSuperAdmin) {
        throw new Error('Anda tidak memiliki wewenang untuk mencairkan dana');
      }

      // CAS Update status
      const cas = await tx.financeRequest.updateMany({
        where: { id: requestId, status: 'MenungguPencairan' },
        data: { status: 'Dicairkan' }
      });

      if (cas.count === 0) {
        throw new Error('Pengajuan sudah dicairkan atau diubah oleh pengguna lain');
      }

      // Create Disbursement Record
      const disbursement = await tx.financeDisbursement.create({
        data: {
          finance_request_id: requestId,
          disbursed_by: actorId,
          disbursed_at: new Date(),
          method,
          reference_no: referenceNo || null,
          amount_idr: request.amount_idr,
          note: note || null,
          proof_file_path: proofFilePath || null
        }
      });

      // Update Step 3
      await tx.approvalStep.updateMany({
        where: { request_type: 'Finance', request_id: requestId, step_order: 3 },
        data: {
          status: 'Approved',
          acted_by: actorId,
          acted_at: new Date(),
          note: note || `Dicairkan via ${method}`
        }
      });

      // Send notification
      const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const amountStr = Number(request.amount_idr).toLocaleString('id-ID');
      await NotificationService.notify(
        tx,
        request.user_id,
        'Dana Presensi / Pengajuan Dicairkan',
        `Pengajuan dana Anda sebesar Rp ${amountStr} telah dicairkan pada ${todayStr} melalui metode ${method}.`
      );

      return disbursement;
    });
  }

  // 4. Cancel Request (Pemohon)
  static async cancelRequest(userId: string, requestId: string) {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.financeRequest.findUnique({ where: { id: requestId } });
      if (!request) throw new Error('Pengajuan tidak ditemukan');

      if (request.user_id !== userId) {
        throw new Error('Anda tidak memiliki akses untuk membatalkan pengajuan ini');
      }

      if (request.status !== 'Diajukan') {
        throw new Error('Pembatalan hanya dapat dilakukan saat pengajuan masih berstatus Menunggu Atasan (Diajukan)');
      }

      return await tx.financeRequest.update({
        where: { id: requestId },
        data: { status: 'Dibatalkan', cancelled_at: new Date() }
      });
    });
  }

  // 5. Summaries
  static async getCeoSummary() {
    const pendingList = await prisma.financeRequest.findMany({
      where: { status: 'MenungguCEO' }
    });

    const pendingCount = pendingList.length;
    const pendingAmountIdr = pendingList.reduce((acc, curr) => acc + Number(curr.amount_idr), 0);

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const approvedThisMonth = await prisma.financeRequest.findMany({
      where: {
        status: { in: ['MenungguPencairan', 'Dicairkan'] },
        updated_at: { gte: firstDayOfMonth }
      }
    });

    const approvedCountThisMonth = approvedThisMonth.length;
    const approvedAmountThisMonth = approvedThisMonth.reduce((acc, curr) => acc + Number(curr.amount_idr), 0);

    // Group by category
    const categoryStats: Record<string, { count: number; total_amount: number }> = {};
    for (const req of pendingList) {
      const cat = req.category || 'Lainnya';
      if (!categoryStats[cat]) categoryStats[cat] = { count: 0, total_amount: 0 };
      categoryStats[cat].count += 1;
      categoryStats[cat].total_amount += Number(req.amount_idr);
    }

    return {
      pending: { count: pendingCount, total_amount: pendingAmountIdr },
      approved_this_month: { count: approvedCountThisMonth, total_amount: approvedAmountThisMonth },
      by_category: categoryStats
    };
  }

  static async getFinanceSummary() {
    const pendingList = await prisma.financeRequest.findMany({
      where: { status: 'MenungguPencairan' }
    });

    const pendingCount = pendingList.length;
    const pendingAmountIdr = pendingList.reduce((acc, curr) => acc + Number(curr.amount_idr), 0);

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const disbursedThisMonth = await prisma.financeDisbursement.findMany({
      where: { disbursed_at: { gte: firstDayOfMonth } }
    });

    const disbursedCountThisMonth = disbursedThisMonth.length;
    const disbursedAmountThisMonth = disbursedThisMonth.reduce((acc, curr) => acc + Number(curr.amount_idr), 0);

    const rejectedThisMonth = await prisma.financeRequest.findMany({
      where: {
        status: 'Ditolak',
        updated_at: { gte: firstDayOfMonth }
      }
    });

    return {
      pending_disbursement: { count: pendingCount, total_amount: pendingAmountIdr },
      disbursed_this_month: { count: disbursedCountThisMonth, total_amount: disbursedAmountThisMonth },
      rejected_this_month: { count: rejectedThisMonth.length }
    };
  }

  // 6. Reassign Approver
  static async reassignApprover(actorId: string, requestId: string, stepOrder: number, newApproverUserId: string) {
    return await prisma.$transaction(async (tx) => {
      const step = await tx.approvalStep.findFirst({
        where: { request_type: 'Finance', request_id: requestId, step_order: stepOrder }
      });
      if (!step) throw new Error('Langkah persetujuan tidak ditemukan');

      const oldApprover = step.assigned_to_user_id;

      await tx.approvalStep.update({
        where: { id: step.id },
        data: { assigned_to_user_id: newApproverUserId }
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          actor_id: actorId,
          action: 'REASSIGN_APPROVER',
          entity: 'ApprovalStep',
          entity_id: step.id,
          before_json: JSON.stringify({ assigned_to_user_id: oldApprover }),
          after_json: JSON.stringify({ assigned_to_user_id: newApproverUserId })
        }
      });

      return { success: true };
    });
  }
}
