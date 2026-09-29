import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import express from 'express';
import { prisma } from '../src/utils/prisma';
import { FinanceService } from '../src/services/finance.service';
import { FinanceRequestKind } from '@prisma/client';

describe('Tahap 6 — Alur Approval Keuangan (4-Step Workflow)', () => {
  let employeeId: string;
  let managerId: string;
  let ceoId: string;
  let financeId: string;

  beforeAll(async () => {
    // Setup test users & permissions
    const reqRole = await prisma.role.findFirst({ where: { name: 'Employee' } });
    const mgrRole = await prisma.role.findFirst({ where: { name: 'Manager' } });
    const execRole = await prisma.role.findFirst({ where: { name: 'Executive' } });
    const finRole = await prisma.role.findFirst({ where: { name: 'Finance' } });

    // Ensure permissions exist
    const disbursePerm = await prisma.permission.upsert({
      where: { name: 'finance.disburse' },
      update: {},
      create: { name: 'finance.disburse' }
    });
    const execPerm = await prisma.permission.upsert({
      where: { name: 'finance.approve.executive' },
      update: {},
      create: { name: 'finance.approve.executive' }
    });
    const mgrPerm = await prisma.permission.upsert({
      where: { name: 'finance.approve.manager' },
      update: {},
      create: { name: 'finance.approve.manager' }
    });

    if (finRole) {
      await prisma.rolePermission.upsert({
        where: { role_id_permission_id: { role_id: finRole.id, permission_id: disbursePerm.id } },
        update: {},
        create: { role_id: finRole.id, permission_id: disbursePerm.id }
      });
    }

    if (execRole) {
      await prisma.rolePermission.upsert({
        where: { role_id_permission_id: { role_id: execRole.id, permission_id: execPerm.id } },
        update: {},
        create: { role_id: execRole.id, permission_id: execPerm.id }
      });
    }

    if (mgrRole) {
      await prisma.rolePermission.upsert({
        where: { role_id_permission_id: { role_id: mgrRole.id, permission_id: mgrPerm.id } },
        update: {},
        create: { role_id: mgrRole.id, permission_id: mgrPerm.id }
      });
    }

    // Find seed users
    const ceo = await prisma.user.findFirst({ where: { nik: 'CEO001' } });
    const manager = await prisma.user.findFirst({ where: { nik: 'MGR001' } });
    const finance = await prisma.user.findFirst({ where: { nik: 'FIN001' } });
    const employee = await prisma.user.findFirst({ where: { nik: 'EMP001' } });

    ceoId = ceo!.id;
    managerId = manager!.id;
    financeId = finance!.id;
    employeeId = employee!.id;
  });

  it('1. Alur Penuh: Employee submit -> Manager approves -> CEO approves -> Finance disburses', async () => {
    // 1. Submit
    const reqst = await FinanceService.submitFinanceRequest(
      employeeId,
      FinanceRequestKind.Reimbursement,
      'Perjalanan Dinas',
      150000,
      'Klaim bensin perjalanan dinas luar kota',
      ['struk.jpg']
    );

    expect(reqst.status).toBe('Diajukan');

    const steps1 = await prisma.approvalStep.findMany({
      where: { request_id: reqst.id, request_type: 'Finance' },
      orderBy: { step_order: 'asc' }
    });
    expect(steps1).toHaveLength(3);
    expect(steps1[0].status).toBe('Pending'); // Manager step

    // 2. Manager approves
    const res1 = await FinanceService.approveOrRejectStep(managerId, reqst.id, 'Approve', 'ACC Manager');
    expect(res1.status).toBe('MenungguCEO');

    // 3. CEO approves
    const res2 = await FinanceService.approveOrRejectStep(ceoId, reqst.id, 'Approve', 'ACC CEO');
    expect(res2.status).toBe('MenungguPencairan');

    // 4. Finance disburses
    const disbursement = await FinanceService.disburseRequest(
      financeId,
      reqst.id,
      'Transfer',
      'TRX-998877',
      'Sudah ditransfer via BCA'
    );

    expect(Number(disbursement.amount_idr)).toBe(150000);

    const finalReq = await prisma.financeRequest.findUnique({ where: { id: reqst.id } });
    expect(finalReq?.status).toBe('Dicairkan');
  });

  it('2. Penolakan oleh Manager', async () => {
    const reqst = await FinanceService.submitFinanceRequest(
      employeeId,
      FinanceRequestKind.Reimbursement,
      'Lainnya',
      50000,
      'Klaim parkir bulanan karyawan',
      ['nota.jpg']
    );

    const res = await FinanceService.approveOrRejectStep(managerId, reqst.id, 'Reject', 'Nota tidak valid');
    expect(res.status).toBe('Ditolak');

    const finalReq = await prisma.financeRequest.findUnique({ where: { id: reqst.id } });
    expect(finalReq?.status).toBe('Ditolak');
  });

  it('3. Deduplikasi: Pemohon adalah CEO -> Otomatis lewati Atasan dan CEO', async () => {
    const reqst = await FinanceService.submitFinanceRequest(
      ceoId,
      FinanceRequestKind.Purchase,
      'Software/Langganan',
      500000,
      'Langganan Claude Pro https://claude.ai',
      []
    );

    expect(reqst.status).toBe('MenungguPencairan');
    expect(reqst.is_ceo_submitted).toBe(true);

    const steps = await prisma.approvalStep.findMany({
      where: { request_id: reqst.id, request_type: 'Finance' },
      orderBy: { step_order: 'asc' }
    });
    expect(steps[0].status).toBe('Skipped');
    expect(steps[1].status).toBe('Skipped');
    expect(steps[2].status).toBe('Pending');
  });

  it('4. Pemohon berperan Keuangan -> Tidak boleh mencairkan pengajuannya sendiri', async () => {
    // Submit request as employee, then attempt to disburse as employee (if employee had finance perm) or submit as finance (no manager -> step 1 skipped, step 2 CEO -> CEO approves -> step 3 Finance)
    const reqst = await FinanceService.submitFinanceRequest(
      financeId,
      FinanceRequestKind.Reimbursement,
      'Perlengkapan Kerja',
      100000,
      'Beli kertas HVS A4 kantor',
      ['struk.jpg']
    );

    // Step 1 was skipped (no manager). Step 2 is CEO.
    await FinanceService.approveOrRejectStep(ceoId, reqst.id, 'Approve', 'ACC CEO');

    // Attempt to self-disburse by financeId
    await expect(
      FinanceService.disburseRequest(financeId, reqst.id, 'Tunai', 'REF-SELF')
    ).rejects.toThrow('Pemohon tidak boleh mencairkan pengajuannya sendiri');
  });

  it('5. Ambang Nominal CEO Threshold', async () => {
    // Set threshold to 1.000.000
    await prisma.appSetting.upsert({
      where: { key: 'finance_ceo_threshold_idr' },
      update: { value: '1000000' },
      create: { key: 'finance_ceo_threshold_idr', value: '1000000' }
    });

    // Request below threshold (200.000)
    const reqst = await FinanceService.submitFinanceRequest(
      employeeId,
      FinanceRequestKind.Reimbursement,
      'Perlengkapan Kerja',
      200000,
      'Beli tinta printer kantor',
      ['nota.jpg']
    );

    const steps = await prisma.approvalStep.findMany({
      where: { request_id: reqst.id, request_type: 'Finance' },
      orderBy: { step_order: 'asc' }
    });
    expect(steps[1].status).toBe('Skipped'); // CEO step skipped

    // Manager approves -> directly goes to MenungguPencairan
    const res = await FinanceService.approveOrRejectStep(managerId, reqst.id, 'Approve');
    expect(res.status).toBe('MenungguPencairan');

    // Reset threshold back to 0
    await prisma.appSetting.update({
      where: { key: 'finance_ceo_threshold_idr' },
      data: { value: '0' }
    });
  });

  it('6. Mencegah Pencairan Ganda (Compare-and-set)', async () => {
    const reqst = await FinanceService.submitFinanceRequest(
      ceoId,
      FinanceRequestKind.Purchase,
      'Software/Langganan',
      300000,
      'Lisensi Figma https://figma.com',
      []
    );

    // Disburse 1st time
    await FinanceService.disburseRequest(financeId, reqst.id, 'Transfer', 'TRX-1');

    // Disburse 2nd time should fail
    await expect(
      FinanceService.disburseRequest(financeId, reqst.id, 'Transfer', 'TRX-2')
    ).rejects.toThrow('Pengajuan tidak dalam status MenungguPencairan');
  });
});
