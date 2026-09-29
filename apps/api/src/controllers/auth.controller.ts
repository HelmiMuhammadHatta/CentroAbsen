import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { generateAccessToken } from '../utils/jwt';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { identifier, password } = req.body;
      const { user, refreshToken, familyId } = await AuthService.login(identifier, password);
      
      const accessToken = generateAccessToken(user.id, user.role);

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

      res.json({ message: 'Login berhasil', role: user.role });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }
}
