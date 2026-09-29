import { Request, Response } from 'express';
import { AttendanceService } from '../services/attendance.service';
import { AttendanceType, WorkMode } from '@prisma/client';

export class AttendanceController {
  static async submit(req: Request, res: Response) {
    try {
      // asumsikan middleware auth menyuntikkan user ke req.user
      const userId = (req as any).user?.id || req.body.userId; // fallback untuk test
      const idempotencyKey = req.headers['idempotency-key'] as string;

      if (!idempotencyKey) {
        return res.status(400).json({ error: 'Header Idempotency-Key wajib disertakan' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Foto wajib disertakan' });
      }

      const attendance = await AttendanceService.submitAttendance({
        userId,
        type: req.body.type as AttendanceType,
        clientCapturedAt: req.body.clientCapturedAt,
        latitude: parseFloat(req.body.latitude),
        longitude: parseFloat(req.body.longitude),
        accuracyMeters: parseFloat(req.body.accuracyMeters),
        workMode: req.body.workMode as WorkMode,
        idempotencyKey,
        photoBuffer: req.file.buffer
      });

      res.status(201).json({ message: 'Absensi berhasil dicatat', data: attendance });
    } catch (error: any) {
      res.status(error.message.includes('Anda sudah melakukan') ? 409 : 400).json({ error: error.message });
    }
  }
}
