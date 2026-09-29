import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';

const prisma = new PrismaClient();

export class ReportController {
  static async exportAttendance(req: Request, res: Response) {
    const { month, year } = req.query; 
    
    if (!month || !year) {
      return res.status(400).json({ error: 'Parameter month dan year wajib (contoh: month=09&year=2026)' });
    }

    const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Laporan_Absensi_${year}_${month}.xlsx`
    );

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: res,
      useStyles: true,
      useSharedStrings: true
    });

    const worksheet = workbook.addWorksheet('Data Absensi');
    
    worksheet.columns = [
      { header: 'NIK', key: 'nik', width: 15 },
      { header: 'Nama', key: 'name', width: 25 },
      { header: 'Tanggal', key: 'date', width: 15 },
      { header: 'Tipe', key: 'type', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Mode Kerja', key: 'mode', width: 15 },
    ];

    // Gunakan cursor untuk query efisien menghindari N+1 memory bloat
    // Simulasi iterasi batching menggunakan limit/offset untuk Prisma (Prisma belum punya cursor streaming native murni yg ringan tanpa id, kita pakai batch).
    let skip = 0;
    const take = 1000;
    let hasMore = true;

    while (hasMore) {
      const records = await prisma.attendance.findMany({
        where: { work_date: { gte: startDate, lte: endDate } },
        include: { user: true },
        orderBy: { work_date: 'asc' },
        skip,
        take
      });

      if (records.length === 0) {
        hasMore = false;
        break;
      }

      for (const r of records) {
        worksheet.addRow({
          nik: r.user.nik,
          name: r.user.name,
          date: r.work_date.toISOString().split('T')[0],
          type: r.type,
          status: r.status,
          mode: r.work_mode
        }).commit();
      }

      skip += take;
    }

    await workbook.commit();
  }
}
