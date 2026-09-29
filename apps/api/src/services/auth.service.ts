import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class AuthService {
  static async login(identifier: string, passwordPlain: string) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { nik: identifier }]
      }
    });

    if (!user) {
      throw new Error('Kredensial tidak valid');
    }

    if (!user.is_active) {
      throw new Error('Akun tidak aktif');
    }

    if (user.locked_until && user.locked_until > new Date()) {
      throw new Error('Akun terkunci, coba lagi nanti');
    }

    const isValid = await argon2.verify(user.password_hash, passwordPlain);

    if (!isValid) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failed_login_count: { increment: 1 },
          locked_until: user.failed_login_count + 1 >= 5 ? new Date(Date.now() + 15 * 60000) : null
        }
      });
      throw new Error('Kredensial tidak valid');
    }

    // Reset failed login
    await prisma.user.update({
      where: { id: user.id },
      data: { failed_login_count: 0, locked_until: null }
    });

    const familyId = crypto.randomUUID();
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await prisma.refreshToken.create({
      data: {
        id: crypto.randomUUID(),
        family_id: familyId,
        hash: refreshHash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    return { user, refreshToken, familyId };
  }
}
