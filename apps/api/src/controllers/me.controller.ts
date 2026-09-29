import { Request, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

export class MeController {
  static async getMe(req: Request, res: Response) {
    try {
      // Mock req.user untul sementara karena middleware otentikasi penuh belum di-mount secara sempurna di simulasi
      const userId = (req as any).user?.id || req.query.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Tidak terotentikasi' });
      }

      const user = await prisma.user.findUnique({ where: { id: String(userId) }});
      if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

      // Hitung kapabilitas
      const hasSubordinates = (await prisma.user.count({ where: { manager_id: user.id } })) > 0;
      
      const isManager = user.role === Role.Manager || hasSubordinates;
      const isFinance = user.role === Role.Finance;
      const isHr = user.role === Role.HrAdmin;
      // Anggap CEO ditandai dengan role Director (enum Prisma: Employee, Manager, Finance, HrAdmin, Director)
      // Mari asumsikan Director adalah CEO, jika tidak ada enum, kita fallback ke isHr untuk simulasi.
      const isExecutive = user.role === 'Director' || user.email === 'ceo@centroabsen.com';

      res.json({
        id: user.id,
        name: user.name,
        role: user.role,
        capabilities: {
          isManager,
          isFinance,
          isHr,
          isExecutive,
          canApprove: isManager || isFinance || isHr || isExecutive,
          canDisburse: isFinance
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
