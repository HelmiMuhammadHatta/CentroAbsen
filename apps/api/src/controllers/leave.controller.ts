import { Request, Response } from 'express';
import { LeaveService } from '../services/leave.service';
import { prisma } from '../utils/prisma';
import { RequestStatus } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

export class LeaveController {
  static async calculateWorkDays(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) return res.status(400).json({ error: 'startDate dan endDate diperlukan' });
      
      const count = await LeaveService.calculateWorkDays(startDate as string, endDate as string);
      res.json({ data: { workDays: count } });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  static async submit(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { leaveTypeId, startDate, endDate, reason } = req.body;
      const files = req.files as Express.Multer.File[];

      let attachmentPaths: string[] = [];
      if (files && files.length > 0) {
        if (files.length > 5) return res.status(400).json({ error: 'Maksimal 5 lampiran' });
        for (const file of files) {
          if (file.size > 5 * 1024 * 1024) return res.status(400).json({ error: 'Ukuran lampiran maksimal 5MB' });
          if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.mimetype)) {
            return res.status(400).json({ error: 'Format lampiran harus JPG/PNG/PDF' });
          }
          const fileName = crypto.randomBytes(16).toString('hex') + path.extname(file.originalname);
          const filePath = path.join(process.cwd(), 'uploads', fileName);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, file.buffer);
          attachmentPaths.push(fileName);
        }
      }

      const request = await LeaveService.submitLeaveRequest(userId, leaveTypeId, startDate, endDate, reason, attachmentPaths);
      res.status(201).json({ data: request });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const status = req.query.status as RequestStatus;
      
      let where: any = { user_id: userId };
      if (status) where.status = status;

      const requests = await prisma.leaveRequest.findMany({
        where,
        include: {
          leave_type: true
        },
        orderBy: { created_at: 'desc' }
      });

      const populated = await Promise.all(requests.map(async (reqst: any) => {
        const attachments = await prisma.requestAttachment.findMany({ where: { request_id: reqst.id, request_type: 'Leave' } });
        const stepsRaw = await prisma.approvalStep.findMany({ where: { request_id: reqst.id, request_type: 'Leave' }, orderBy: { step_order: 'asc' } });
        
        const approval_steps = await Promise.all(stepsRaw.map(async (step: any) => {
          const assignee = step.assigned_to_user_id ? await prisma.user.findUnique({ where: { id: step.assigned_to_user_id }, select: { full_name: true } }) : null;
          const actor = step.acted_by ? await prisma.user.findUnique({ where: { id: step.acted_by }, select: { full_name: true } }) : null;
          return { ...step, assignee, actor };
        }));

        return { ...reqst, attachments, approval_steps };
      }));

      res.json({ data: populated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async cancel(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id as string;

      const reqst = await prisma.leaveRequest.findUnique({ where: { id } });
      if (!reqst) return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });
      if (reqst.user_id !== userId) return res.status(403).json({ error: 'Akses ditolak' });
      
      if (reqst.status !== RequestStatus.Pending) {
        return res.status(400).json({ error: 'Hanya pengajuan dengan status Pending yang dapat dibatalkan oleh pemohon' });
      }

      await prisma.$transaction(async (tx) => {
        await tx.leaveRequest.update({
          where: { id },
          data: { status: RequestStatus.Rejected, cancelled_at: new Date() } // or create Cancelled status if needed. The prompt says "status Ditolak" or "dibatalkan"
        });
        
        await tx.approvalStep.updateMany({
          where: { request_id: id, request_type: 'Leave', status: RequestStatus.Pending },
          data: { status: RequestStatus.Rejected, note: 'Dibatalkan oleh pemohon', acted_at: new Date() }
        });
      });

      res.json({ message: 'Pengajuan berhasil dibatalkan' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }
}
