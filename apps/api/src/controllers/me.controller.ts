import { prisma } from '../utils/prisma';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';



export class MeController {
  static async getMe(req: Request, res: Response) {
    try {
      // TODO: Replace with proper middleware auth later
      const userId = (req as any).user?.id || req.query.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Tidak terotentikasi' });
      }

      const user = await prisma.user.findUnique({
        where: { id: String(userId) }
      });
      if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

      // Get roles and permissions
      const userRoles = await prisma.userRole.findMany({
        where: { user_id: user.id }
      });
      const roleIds = userRoles.map(ur => ur.role_id);
      
      let roleNames: string[] = [];
      let permissions: string[] = [];
      
      if (roleIds.length > 0) {
        const roles = await prisma.role.findMany({
          where: { id: { in: roleIds } }
        });
        roleNames = roles.map(r => r.name);
        
        const rolePerms = await prisma.rolePermission.findMany({
          where: { role_id: { in: roleIds } }
        });
        const permIds = rolePerms.map(rp => rp.permission_id);
        if (permIds.length > 0) {
          const perms = await prisma.permission.findMany({
            where: { id: { in: permIds } }
          });
          permissions = perms.map(p => p.name);
        }
      }

      res.json({
        id: user.id,
        name: user.full_name,
        email: user.email,
        employeeId: user.nik,
        work_arrangement: user.work_arrangement,
        roles: roleNames,
        permissions
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
