import { prisma } from '../utils/prisma';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';



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
          name: r.user.full_name,
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

  static async exportFinance(req: Request, res: Response) {
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
      `attachment; filename=Laporan_Keuangan_${year}_${month}.xlsx`
    );

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: res,
      useStyles: true,
      useSharedStrings: true
    });

    const worksheet = workbook.addWorksheet('Laporan Keuangan');
    
    worksheet.columns = [
      { header: 'NIK Pemohon', key: 'nik', width: 15 },
      { header: 'Nama Pemohon', key: 'name', width: 25 },
      { header: 'Jenis', key: 'kind', width: 15 },
      { header: 'Kategori', key: 'category', width: 20 },
      { header: 'Nominal (IDR)', key: 'amount', width: 18 },
      { header: 'Status Akhir', key: 'status', width: 18 },
      { header: 'Tgl Pengajuan', key: 'created_at', width: 18 },
      { header: 'Tgl Disetujui Atasan', key: 'mgr_date', width: 20 },
      { header: 'Tgl Disetujui CEO', key: 'ceo_date', width: 20 },
      { header: 'Tgl Pencairan', key: 'disbursed_at', width: 20 },
      { header: 'Metode Pencairan', key: 'method', width: 18 },
      { header: 'No Referensi', key: 'ref_no', width: 20 }
    ];

    const records = await prisma.financeRequest.findMany({
      where: { created_at: { gte: startDate, lte: endDate } },
      include: {
        user: true,
        disbursement: true
      },
      orderBy: { created_at: 'asc' }
    });

    for (const r of records) {
      const steps = await prisma.approvalStep.findMany({
        where: { request_id: r.id, request_type: 'Finance' },
        orderBy: { step_order: 'asc' }
      });

      const mgrStep = steps.find(s => s.step_order === 1 && s.status === 'Approved');
      const ceoStep = steps.find(s => s.step_order === 2 && s.status === 'Approved');

      worksheet.addRow({
        nik: r.user.nik,
        name: r.user.full_name,
        kind: r.kind,
        category: r.category,
        amount: Number(r.amount_idr),
        status: r.status,
        created_at: r.created_at.toISOString().split('T')[0],
        mgr_date: mgrStep?.acted_at ? mgrStep.acted_at.toISOString().split('T')[0] : '-',
        ceo_date: ceoStep?.acted_at ? ceoStep.acted_at.toISOString().split('T')[0] : '-',
        disbursed_at: r.disbursement?.disbursed_at ? r.disbursement.disbursed_at.toISOString().split('T')[0] : '-',
        method: r.disbursement?.method || '-',
        ref_no: r.disbursement?.reference_no || '-'
      }).commit();
    }

    await workbook.commit();
  }
}
