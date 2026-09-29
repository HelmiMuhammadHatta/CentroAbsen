import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(2),
});

export class DepartmentController {
  static async list(req: Request, res: Response) {
    try {
      const depts = await prisma.department.findMany();
      res.json({ data: depts });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async get(req: Request, res: Response) {
    try {
      const dept = await prisma.department.findUnique({ where: { id: req.params.id as string } });
      if (!dept) return res.status(404).json({ error: 'Divisi tidak ditemukan' });
      res.json({ data: dept });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const data = createSchema.parse(req.body);
      const dept = await prisma.department.create({ data });
      
      // Audit log
      await prisma.auditLog.create({
        data: {
          actor_id: (req as any).user.id,
          action: 'CREATE_DEPARTMENT',
          entity: 'department',
          entity_id: dept.id,
          after_json: JSON.stringify(dept)
        }
      });

      res.status(201).json({ data: dept });
    } catch (e: any) {
      res.status(400).json({ error: e.errors || e.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const data = createSchema.partial().parse(req.body);
      const before = await prisma.department.findUnique({ where: { id: req.params.id as string } });
      if (!before) return res.status(404).json({ error: 'Divisi tidak ditemukan' });

      const dept = await prisma.department.update({
        where: { id: req.params.id as string },
        data
      });

      await prisma.auditLog.create({
        data: {
          actor_id: (req as any).user.id,
          action: 'UPDATE_DEPARTMENT',
          entity: 'department',
          entity_id: dept.id,
          before_json: JSON.stringify(before),
          after_json: JSON.stringify(dept)
        }
      });

      res.json({ data: dept });
    } catch (e: any) {
      res.status(400).json({ error: e.errors || e.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const before = await prisma.department.findUnique({ where: { id: req.params.id as string } });
      if (!before) return res.status(404).json({ error: 'Divisi tidak ditemukan' });

      await prisma.department.delete({ where: { id: req.params.id as string } });

      await prisma.auditLog.create({
        data: {
          actor_id: (req as any).user.id,
          action: 'DELETE_DEPARTMENT',
          entity: 'department',
          entity_id: req.params.id as string,
          before_json: JSON.stringify(before)
        }
      });

      res.json({ message: 'Divisi berhasil dihapus' });
    } catch (e: any) {
      res.status(400).json({ error: 'Gagal menghapus divisi. Mungkin masih digunakan.' });
    }
  }
}
