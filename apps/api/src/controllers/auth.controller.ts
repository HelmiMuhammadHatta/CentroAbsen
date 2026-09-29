import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { generateAccessToken } from '../utils/jwt';
import { AuthRequest } from '../middlewares/auth.middleware';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, identifier, password } = req.body;
      const loginId = email || identifier;
      const { user, refreshToken, familyId } = await AuthService.login(loginId, password);
      
      const accessToken = generateAccessToken(user.id);

      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000 // 15 mins
      });

      res.cookie('refresh_token', `${familyId}:${refreshToken}`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({ 
        message: 'Login berhasil',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          employeeId: user.nik,
        }
      });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const tokenString = req.cookies?.refresh_token;
      if (!tokenString) {
        return res.status(401).json({ error: 'Sesi tidak tersedia' });
      }

      const [familyId, plainRefreshToken] = tokenString.split(':');
      if (!familyId || !plainRefreshToken) {
        return res.status(401).json({ error: 'Sesi tidak valid' });
      }

      const { newRefreshToken, userId } = await AuthService.refresh(familyId, plainRefreshToken);
      
      const newAccessToken = generateAccessToken(userId);

      res.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000 // 15 mins
      });

      res.cookie('refresh_token', `${familyId}:${newRefreshToken}`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({ message: 'Sesi diperbarui', accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (error: any) {
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      res.status(401).json({ error: error.message });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const tokenString = req.cookies?.refresh_token;
      if (tokenString) {
        const [familyId] = tokenString.split(':');
        if (familyId) {
          await AuthService.logout(familyId);
        }
      }
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      res.json({ message: 'Logout berhasil' });
    } catch (error: any) {
      res.status(500).json({ error: 'Gagal logout' });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email wajib diisi' });
      
      await AuthService.forgotPassword(email);
      res.json({ message: 'Jika email terdaftar, instruksi reset password telah dikirim.' });
    } catch (error: any) {
      res.status(500).json({ error: 'Gagal memproses permintaan' });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token dan password baru wajib diisi' });
      }

      await AuthService.resetPassword(token, newPassword);
      res.json({ message: 'Password berhasil diubah, silakan login kembali' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async changePassword(req: AuthRequest, res: Response) {
    try {
      const { oldPassword, newPassword } = req.body;
      if (!req.user || !oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Permintaan tidak valid' });
      }

      await AuthService.changePassword(req.user.id, oldPassword, newPassword);
      
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      res.json({ message: 'Password berhasil diubah, silakan login kembali' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async listSessions(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const sessions = await AuthService.listSessions(req.user.id);
      res.json({ data: sessions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async revokeSession(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const targetId = req.params.id as string;
      await AuthService.revokeSession(req.user.id, targetId);
      res.json({ message: 'Sesi berhasil dicabut' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
