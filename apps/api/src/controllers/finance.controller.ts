import { Request, Response } from 'express';
import { FinanceService } from '../services/finance.service';
import { prisma } from '../utils/prisma';
import { FinanceRequestKind } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

export class FinanceController {
  // 1. Submit Request
  static async submit(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { kind, category, amountIdr, description } = req.body;
      const files = req.files as Express.Multer.File[];
      const approverIds = req.body.approverIds ? (Array.isArray(req.body.approverIds) ? req.body.approverIds : [req.body.approverIds]) : undefined;

      if (kind === 'CashAdvance') {
        return res.status(400).json({ error: 'Cash Advance (kasbon) tidak lagi dapat diajukan untuk pengajuan baru.' });
      }

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

      const request = await FinanceService.submitFinanceRequest(
        userId,
        kind as FinanceRequestKind,
        category,
        Number(amountIdr),
        description,
        attachmentPaths,
        approverIds
      );

      res.status(201).json({ data: request });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  // 2. List Own Requests
  static async list(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const status = req.query.status as string;

      let where: any = { user_id: userId };
      if (status) where.status = status;

      const requests = await prisma.financeRequest.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: { disbursement: true }
      });

      const populated = await Promise.all(
        requests.map(async (reqst: any) => {
          const attachments = await prisma.requestAttachment.findMany({
            where: { request_id: reqst.id, request_type: 'Finance' }
          });
          const stepsRaw = await prisma.approvalStep.findMany({
            where: { request_id: reqst.id, request_type: 'Finance' },
            orderBy: { step_order: 'asc' }
          });

          return { ...reqst, attachments, approval_steps: stepsRaw };
        })
      );

      res.json({ data: populated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  // 3. Detail with 4-Step Timeline
  static async getDetail(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const request = await prisma.financeRequest.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, full_name: true, nik: true, email: true } },
          disbursement: {
            include: { disbursed_by_user: { select: { id: true, full_name: true } } }
          }
        }
      });

      if (!request) return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });

      const attachments = await prisma.requestAttachment.findMany({
        where: { request_id: id, request_type: 'Finance' }
      });

      const stepsRaw = await prisma.approvalStep.findMany({
        where: { request_id: id, request_type: 'Finance' },
        orderBy: { step_order: 'asc' }
      });

      const stepsWithDetails = await Promise.all(
        stepsRaw.map(async (step: any) => {
          const assignee = step.assigned_to_user_id
            ? await prisma.user.findUnique({ where: { id: step.assigned_to_user_id }, select: { full_name: true } })
            : null;
          const actor = step.acted_by
            ? await prisma.user.findUnique({ where: { id: step.acted_by }, select: { full_name: true } })
            : null;
          return { ...step, assignee, actor };
        })
      );

      res.json({
        data: {
          ...request,
          attachments,
          approval_steps: stepsWithDetails
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  // 4. Approve Step (Manager or CEO)
  static async approve(req: Request, res: Response) {
    try {
      const actorId = (req as any).user.id;
      const id = req.params.id as string;
      const { note } = req.body;

      const result = await FinanceService.approveOrRejectStep(actorId, id, 'Approve', note);
      res.json({ message: 'Langkah pengajuan berhasil disetujui', data: result });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  // 5. Reject Step
  static async reject(req: Request, res: Response) {
    try {
      const actorId = (req as any).user.id;
      const id = req.params.id as string;
      const { note, reason } = req.body;
      const rejectNote = note || reason;

      const result = await FinanceService.approveOrRejectStep(actorId, id, 'Reject', rejectNote);
      res.json({ message: 'Pengajuan berhasil ditolak', data: result });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  // 6. Disburse (Keuangan)
  static async disburse(req: Request, res: Response) {
    try {
      const actorId = (req as any).user.id;
      const id = req.params.id as string;
      const { method, referenceNo, note } = req.body;
      const file = req.file as Express.Multer.File | undefined;

      let proofFilePath: string | undefined = undefined;
      if (file) {
        if (file.size > 5 * 1024 * 1024) return res.status(400).json({ error: 'Ukuran bukti pencairan maksimal 5MB' });
        if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.mimetype)) {
          return res.status(400).json({ error: 'Format bukti pencairan harus JPG/PNG/PDF' });
        }
        const fileName = crypto.randomBytes(16).toString('hex') + path.extname(file.originalname);
        const filePath = path.join(process.cwd(), 'uploads', fileName);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.buffer);
        proofFilePath = fileName;
      }

      const disbursement = await FinanceService.disburseRequest(actorId, id, method, referenceNo, note, proofFilePath);
      res.json({ message: 'Pencairan berhasil diproses', data: disbursement });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  // 7. Cancel by Requester
  static async cancel(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id as string;

      const result = await FinanceService.cancelRequest(userId, id);
      res.json({ message: 'Pengajuan berhasil dibatalkan', data: result });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  // 8. CEO Queue & Summary
  static async ceoQueue(req: Request, res: Response) {
    try {
      const requests = await prisma.financeRequest.findMany({
        where: { status: 'MenungguCEO' },
        include: { user: { select: { id: true, full_name: true, nik: true } } },
        orderBy: { created_at: 'desc' }
      });
      res.json({ data: requests });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async ceoSummary(req: Request, res: Response) {
    try {
      const summary = await FinanceService.getCeoSummary();
      res.json({ data: summary });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  // 9. Finance Queue & Summary
  static async financeQueue(req: Request, res: Response) {
    try {
      const tab = (req.query.tab as string) || 'pending'; // pending | disbursed | rejected
      let where: any = {};

      if (tab === 'pending') {
        where.status = 'MenungguPencairan';
      } else if (tab === 'disbursed') {
        where.status = 'Dicairkan';
      } else if (tab === 'rejected') {
        where.status = 'Ditolak';
      }

      const requests = await prisma.financeRequest.findMany({
        where,
        include: {
          user: { select: { id: true, full_name: true, nik: true } },
          disbursement: true
        },
        orderBy: { created_at: 'desc' }
      });

      res.json({ data: requests });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async financeSummary(req: Request, res: Response) {
    try {
      const summary = await FinanceService.getFinanceSummary();
      res.json({ data: summary });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  // 10. Reassign Approver (Admin / HR)
  static async reassign(req: Request, res: Response) {
    try {
      const actorId = (req as any).user.id;
      const id = req.params.id as string;
      const { stepOrder, newApproverUserId } = req.body;

      const result = await FinanceService.reassignApprover(actorId, id, Number(stepOrder), newApproverUserId);
      res.json({ message: 'Approver berhasil ditugaskan ulang', data: result });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }
}
