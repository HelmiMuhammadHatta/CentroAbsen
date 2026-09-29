import { PrismaClient } from '@prisma/client';

export class NotificationService {
  static async notify(tx: any, userId: string, title: string, body: string, link?: string) {
    await tx.notification.create({
      data: {
        user_id: userId,
        title,
        body,
        link
      }
    });
    // Jika ada websocket/push notification logic, letakkan trigger di sini.
  }
}
