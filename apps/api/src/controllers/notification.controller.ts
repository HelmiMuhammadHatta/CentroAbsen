import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export class NotificationController {
  static async list(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const notifications = await prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: 50
      });
      res.json({ data: notifications });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async getUnreadCount(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const count = await prisma.notification.count({
        where: { user_id: userId, is_read: false }
      });
      res.json({ data: { count } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async markAsRead(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id as string;

      const notif = await prisma.notification.findUnique({ where: { id } });
      if (!notif) return res.status(404).json({ error: 'Notifikasi tidak ditemukan' });
      if (notif.user_id !== userId) return res.status(403).json({ error: 'Akses ditolak' });

      await prisma.notification.update({
        where: { id },
        data: { is_read: true }
      });

      res.json({ message: 'Ditandai sudah dibaca' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      await prisma.notification.updateMany({
        where: { user_id: userId, is_read: false },
        data: { is_read: true }
      });
      res.json({ message: 'Semua ditandai sudah dibaca' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
}
