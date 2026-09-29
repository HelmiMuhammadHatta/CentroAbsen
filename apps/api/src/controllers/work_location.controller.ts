import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(5),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius_meters: z.number().min(50).max(1000),
  work_start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  work_end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  late_tolerance_minutes: z.number().min(0).max(120).default(0),
  is_active: z.boolean().default(true)
});

export class WorkLocationController {
  static async list(req: Request, res: Response) {
    try {
      const locations = await prisma.workLocation.findMany();
      res.json({ data: locations });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async get(req: Request, res: Response) {
    try {
      const location = await prisma.workLocation.findUnique({ where: { id: req.params.id as string } });
      if (!location) return res.status(404).json({ error: 'Lokasi tidak ditemukan' });
      res.json({ data: location });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const data = createSchema.parse(req.body);
      const location = await prisma.workLocation.create({ data: data as any });
      
      await prisma.auditLog.create({
        data: {
          actor_id: (req as any).user.id,
          action: 'CREATE_LOCATION',
          entity: 'workLocation',
          entity_id: location.id,
          after_json: JSON.stringify(location)
        }
      });

      res.status(201).json({ data: location });
    } catch (e: any) {
      res.status(400).json({ error: e.errors || e.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const data = createSchema.partial().parse(req.body);
      const before = await prisma.workLocation.findUnique({ where: { id: req.params.id as string } });
      if (!before) return res.status(404).json({ error: 'Lokasi tidak ditemukan' });

      const location = await prisma.workLocation.update({
        where: { id: req.params.id as string },
        data: data as any
      });

      await prisma.auditLog.create({
        data: {
          actor_id: (req as any).user.id,
          action: 'UPDATE_LOCATION',
          entity: 'workLocation',
          entity_id: location.id,
          before_json: JSON.stringify(before),
          after_json: JSON.stringify(location)
        }
      });

      res.json({ data: location });
    } catch (e: any) {
      res.status(400).json({ error: e.errors || e.message });
    }
  }
}
