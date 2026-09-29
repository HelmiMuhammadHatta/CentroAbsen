import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { RequestStatus } from '@prisma/client';
import { ApprovalService } from '../services/approval.service';

export class ApprovalController {
  static async listQueue(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const type = req.query.type as string;
      const status = req.query.status as RequestStatus;
      
      let where: any = {
        assigned_to_user_id: user.id
      };
      
      if (status) {
        where.status = status;
      } else {
        where.status = RequestStatus.Pending; // Default to pending
      }
      if (type) where.request_type = type;

      const steps = await prisma.approvalStep.findMany({
        where,
        orderBy: { created_at: 'desc' }
      });

      const populatedSteps = await Promise.all(steps.map(async (step: any) => {
        let requestData = null;
        if (step.request_type === 'Leave') {
          const leaveReq = await prisma.leaveRequest.findUnique({ where: { id: step.request_id }, include: { user: { select: { full_name: true, nik: true } }, leave_type: { select: { name: true } } } });
          const attachments = await prisma.requestAttachment.findMany({ where: { request_id: step.request_id, request_type: 'Leave' } });
          
          let balance = null;
          if (leaveReq) {
             balance = await prisma.leaveBalance.findUnique({
               where: {
                 user_id_leave_type_id_year: {
                   user_id: leaveReq.user_id,
                   leave_type_id: leaveReq.leave_type_id,
                   year: new Date(leaveReq.start_date).getFullYear()
                 }
               }
             });
          }
          
          requestData = { ...leaveReq, attachments, leave_balance: balance };
        } else if (step.request_type === 'Finance') {
          const finReq = await prisma.financeRequest.findUnique({ where: { id: step.request_id }, include: { user: { select: { full_name: true, nik: true } } } });
          const attachments = await prisma.requestAttachment.findMany({ where: { request_id: step.request_id, request_type: 'Finance' } });
          requestData = { ...finReq, attachments };
        }
        return { ...step, request_data: requestData };
      }));

      res.json({ data: populatedSteps });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async act(req: Request, res: Response) {
    try {
      const actorId = (req as any).user.id;
      const actorRoles = (req as any).user.roles.map((r: any) => r.role.name);
      const { requestType, requestId, action, note } = req.body;

      if (!['Leave', 'Finance'].includes(requestType)) return res.status(400).json({ error: 'Tipe pengajuan tidak valid' });
      if (!['Approve', 'Reject'].includes(action)) return res.status(400).json({ error: 'Aksi tidak valid' });

      const finalStatus = await ApprovalService.actOnStep(actorId, actorRoles, requestType, requestId, action as 'Approve'|'Reject', note);
      res.json({ message: 'Berhasil diproses', data: { status: finalStatus } });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }
}
