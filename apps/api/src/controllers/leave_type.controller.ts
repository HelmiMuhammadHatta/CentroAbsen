import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(2),
  annual_quota_days: z.number().min(0),
  requires_attachment: z.boolean().default(false),
  requires_hr_approval: z.boolean().default(false),
  is_active: z.boolean().default(true)
});

export class LeaveTypeController {
  static async list(req: Request, res: Response) {
    try {
      const types = await prisma.leaveType.findMany();
      res.json({ data: types });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async get(req: Request, res: Response) {
    try {
      const type = await prisma.leaveType.findUnique({ where: { id: req.params.id as string } });
      if (!type) return res.status(404).json({ error: 'Jenis cuti tidak ditemukan' });
      res.json({ data: type });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const data = createSchema.parse(req.body);
      const type = await prisma.leaveType.create({ data: data as any });
      
      await prisma.auditLog.create({
        data: {
          actor_id: (req as any).user.id,
          action: 'CREATE_LEAVETYPE',
          entity: 'leaveType',
          entity_id: type.id,
          after_json: JSON.stringify(type)
        }
      });

      res.status(201).json({ data: type });
    } catch (e: any) {
      res.status(400).json({ error: e.errors || e.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const data = createSchema.partial().parse(req.body);
      const before = await prisma.leaveType.findUnique({ where: { id: req.params.id as string } });
      if (!before) return res.status(404).json({ error: 'Jenis cuti tidak ditemukan' });

      const type = await prisma.leaveType.update({
        where: { id: req.params.id as string },
        data: data as any
      });

      await prisma.auditLog.create({
        data: {
          actor_id: (req as any).user.id,
          action: 'UPDATE_LEAVETYPE',
          entity: 'leaveType',
          entity_id: type.id,
          before_json: JSON.stringify(before),
          after_json: JSON.stringify(type)
        }
      });

      res.json({ data: type });
    } catch (e: any) {
      res.status(400).json({ error: e.errors || e.message });
    }
  }
}
