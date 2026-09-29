import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    roles: string[];
    permissions: string[];
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token tidak tersedia' });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Token tidak valid atau kadaluarsa' });
    }

    const userRoles = await prisma.userRole.findMany({
      where: { user_id: decoded.userId },
      include: { role: true }
    });
    
    const roleIds = userRoles.map(ur => ur.role_id);
    const roleNames = userRoles.map(ur => ur.role.name);
    
    const rolePerms = await prisma.rolePermission.findMany({
      where: { role_id: { in: roleIds } },
      include: { permission: true }
    });
    
    const permissions = rolePerms.map(rp => rp.permission.name);

    req.user = {
      id: decoded.userId,
      roles: roleNames,
      permissions
    };

    next();
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memverifikasi sesi' });
  }
};

export const requirePermission = (requiredPermission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Tidak terotentikasi' });
    }

    // Admin / Executive bypass jika mau diimplementasikan
    if (req.user.permissions.includes(requiredPermission)) {
      return next();
    }

    return res.status(403).json({ error: 'Akses ditolak. Permission tidak mencukupi.' });
  };
};

export const requireCsrf = (req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const csrfHeader = req.headers['x-csrf-token'] || req.headers['x-requested-with'];
    if (!csrfHeader) {
      return res.status(403).json({ error: 'CSRF Protection: Header X-CSRF-Token wajib disertakan' });
    }
  }
  next();
};
