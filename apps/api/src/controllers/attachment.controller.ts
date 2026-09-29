import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import path from 'path';
import fs from 'fs/promises';

export class AttachmentController {
  static async download(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const userRoles = (req as any).user.roles.map((r: any) => r.role.name);
      const id = req.params.id as string;

      const attachment = await prisma.requestAttachment.findUnique({ where: { id } });
      if (!attachment) return res.status(404).json({ error: 'Lampiran tidak ditemukan' });

      // Verifikasi hak akses
      let hasAccess = false;
      if (userRoles.includes('HrAdmin')) {
        hasAccess = true;
      } else {
         if (attachment.request_type === 'Leave') {
           const leave = await prisma.leaveRequest.findUnique({ where: { id: attachment.request_id }});
           if (leave?.user_id === userId) hasAccess = true;
         } else if (attachment.request_type === 'Finance') {
           const finance = await prisma.financeRequest.findUnique({ where: { id: attachment.request_id }});
           if (finance?.user_id === userId) hasAccess = true;
           if (userRoles.includes('Finance')) hasAccess = true; // Finance can see all finance attachments
         }
         
         // If still no access, check if user is an assigned approver
         if (!hasAccess) {
            const steps = await prisma.approvalStep.findMany({ where: { request_id: attachment.request_id, request_type: attachment.request_type }});
            if (steps.some(s => s.assigned_to_user_id === userId)) {
              hasAccess = true;
            }
         }
      }

      if (!hasAccess) return res.status(403).json({ error: 'Akses ditolak' });

      const filePath = path.join(process.cwd(), 'uploads', attachment.file_path);
      
      try {
        await fs.access(filePath);
      } catch (e) {
        return res.status(404).json({ error: 'File fisik tidak ditemukan' });
      }

      res.setHeader('Content-Disposition', `inline; filename="${attachment.original_name}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.sendFile(filePath);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
}
