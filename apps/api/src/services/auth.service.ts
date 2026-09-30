import { env } from '../config/env.config';
import { prisma } from '../utils/prisma';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import crypto from 'crypto';
import { generateAccessToken } from '../utils/jwt';
import nodemailer from 'nodemailer';

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
        user_id: user.id,
        family_id: familyId,
        hash: refreshHash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    return { user, refreshToken, familyId };
  }

  static async refresh(familyId: string, plainRefreshToken: string) {
    const tokenRecord = await prisma.refreshToken.findFirst({
      where: { family_id: familyId },
      orderBy: { created_at: 'desc' }
    });

    if (!tokenRecord) {
      throw new Error('Sesi tidak valid');
    }

    if (tokenRecord.revoked_at) {
      // Reuse detection! Revoke all tokens in family
      await prisma.refreshToken.updateMany({
        where: { family_id: familyId },
        data: { revoked_at: new Date() }
      });
      throw new Error('Sesi tidak valid, harap login kembali');
    }

    if (tokenRecord.expires_at < new Date()) {
      throw new Error('Sesi telah berakhir');
    }

    const expectedHash = crypto.createHash('sha256').update(plainRefreshToken).digest('hex');
    if (tokenRecord.hash !== expectedHash) {
      throw new Error('Sesi tidak valid');
    }

    // Valid. Now revoke this token and issue a new one
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revoked_at: new Date() }
    });

    const newRefreshToken = crypto.randomBytes(32).toString('hex');
    const newRefreshHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    await prisma.refreshToken.create({
      data: {
        id: crypto.randomUUID(),
        user_id: tokenRecord.user_id,
        family_id: familyId,
        hash: newRefreshHash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    return { newRefreshToken, familyId, userId: tokenRecord.user_id };
  }

  static async logout(familyId: string) {
    await prisma.refreshToken.updateMany({
      where: { family_id: familyId, revoked_at: null },
      data: { revoked_at: new Date() }
    });
  }

  static async revokeAllUserTokens(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() }
    });
  }

  static async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return; // Silent fail for security

    const plainToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(plainToken).digest('hex');

    await prisma.passwordResetToken.create({
      data: {
        id: crypto.randomUUID(),
        user_id: user.id,
        hash,
        expires_at: new Date(Date.now() + 30 * 60000) // 30 mins
      }
    });

    // Send email using configured SMTP
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      ignoreTLS: true,
      auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
    });

    const resetLink = `${env.WEB_URL}/reset-password?token=${plainToken}`;

    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: email,
      subject: 'Reset Password CentroAbsen',
      text: `Klik tautan ini untuk reset password Anda: ${resetLink}`
    }).catch(err => console.error('Failed to send email', err));
  }

  static async resetPassword(token: string, newPasswordPlain: string) {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { hash, used_at: null, expires_at: { gt: new Date() } }
    });

    if (!resetToken) {
      throw new Error('Token tidak valid atau sudah kedaluwarsa');
    }

    const newPasswordHash = await argon2.hash(newPasswordPlain);
    
    await prisma.user.update({
      where: { id: resetToken.user_id },
      data: { password_hash: newPasswordHash }
    });

    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used_at: new Date() }
    });

    await this.revokeAllUserTokens(resetToken.user_id);
  }

  static async changePassword(userId: string, oldPasswordPlain: string, newPasswordPlain: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Pengguna tidak ditemukan');

    const isValid = await argon2.verify(user.password_hash, oldPasswordPlain);
    if (!isValid) throw new Error('Password lama tidak valid');

    const newPasswordHash = await argon2.hash(newPasswordPlain);
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: newPasswordHash, must_change_password: false }
    });

    await this.revokeAllUserTokens(userId);
  }

  static async listSessions(userId: string) {
    return await prisma.refreshToken.findMany({
      where: { user_id: userId, revoked_at: null, expires_at: { gt: new Date() } },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        family_id: true,
        created_at: true,
        expires_at: true
      }
    });
  }

  static async revokeSession(userId: string, targetId: string) {
    await prisma.refreshToken.updateMany({
      where: {
        user_id: userId,
        OR: [{ id: targetId }, { family_id: targetId }]
      },
      data: { revoked_at: new Date() }
    });
  }
}
