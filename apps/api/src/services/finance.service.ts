import { prisma } from '../utils/prisma';
import { PrismaClient, RequestStatus, FinanceRequestKind } from '@prisma/client';
import { ApprovalService } from './approval.service';



export class FinanceService {
  static async submitFinanceRequest(
    userId: string, 
    kind: FinanceRequestKind, 
    category: string, 
    amountIdr: number, 
    description: string, 
    attachmentPaths: string[]
  ) {
    if (description.length < 10) throw new Error('Keterangan minimal 10 karakter');
    if (amountIdr <= 0) throw new Error('Nominal harus lebih dari 0');
    if (kind === FinanceRequestKind.Reimbursement && attachmentPaths.length === 0) {
      throw new Error('Reimbursement wajib melampirkan bukti (struk/nota)');
    }
    if (kind === FinanceRequestKind.Purchase && attachmentPaths.length === 0) {
      // PRD: "wajib minimal satu lampiran (penawaran; tautan disimpan di keterangan bila tidak ada file)"
      // Kita cek description apakah ada url (simplifikasi)
      if (!description.includes('http')) {
        throw new Error('Pembelian wajib melampirkan bukti penawaran atau tautan di keterangan');
      }
    }

    return await prisma.$transaction(async (tx) => {
      const request = await tx.financeRequest.create({
        data: {
          user_id: userId,
          kind,
          category,
          amount_idr: amountIdr,
          description,
          status: RequestStatus.Pending
        }
      });

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

      // Setup Approval Engine: requires HR = false, requires Finance = true
      await ApprovalService.setupApprovalSteps(tx, 'Finance', request.id, userId, false, true);

      return request;
    });
  }
}
