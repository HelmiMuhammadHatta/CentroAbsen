import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(2),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export class HolidayController {
  static async list(req: Request, res: Response) {
    try {
      const holidays = await prisma.holiday.findMany({ orderBy: { date: 'asc' } });
      res.json({ data: holidays });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const data = createSchema.parse(req.body);
      const holiday = await prisma.holiday.create({ 
        data: { name: data.name, date: new Date(data.date) }
      });
      
      await prisma.auditLog.create({
        data: {
          actor_id: (req as any).user.id,
          action: 'CREATE_HOLIDAY',
          entity: 'holiday',
          entity_id: holiday.id,
          after_json: JSON.stringify(holiday)
        }
      });

      res.status(201).json({ data: holiday });
    } catch (e: any) {
      res.status(400).json({ error: e.errors || e.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const before = await prisma.holiday.findUnique({ where: { id: req.params.id as string } });
      if (!before) return res.status(404).json({ error: 'Libur tidak ditemukan' });

      await prisma.holiday.delete({ where: { id: req.params.id as string } });

      await prisma.auditLog.create({
        data: {
          actor_id: (req as any).user.id,
          action: 'DELETE_HOLIDAY',
          entity: 'holiday',
          entity_id: req.params.id as string,
          before_json: JSON.stringify(before)
        }
      });

      res.json({ message: 'Libur berhasil dihapus' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }
}
