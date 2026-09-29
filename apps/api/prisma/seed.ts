import { PrismaClient, Role, WorkArrangement, WorkMode, AttendanceType, RequestStatus, FinanceRequestKind } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. App Settings
  await prisma.appSetting.upsert({
    where: { key: 'photo_retention_months' },
    update: {},
    create: { key: 'photo_retention_months', value: '3' },
  });

  // 2. Work Locations
  const hq = await prisma.workLocation.create({
    data: {
      name: 'Kantor Pusat Jakarta',
      address: 'Jl. Sudirman No. 1, Jakarta',
      latitude: -6.225014,
      longitude: 106.805822,
      radius_meters: 150,
      work_start: '08:00',
      work_end: '17:00',
      late_tolerance_minutes: 0,
    },
  });

  const branch = await prisma.workLocation.create({
    data: {
      name: 'Cabang Bandung',
      address: 'Jl. Asia Afrika, Bandung',
      latitude: -6.921345,
      longitude: 107.610214,
      radius_meters: 150,
      work_start: '08:00',
      work_end: '17:00',
      late_tolerance_minutes: 0,
    },
  });

  // 3. Divisions
  const divProduct = await prisma.division.create({ data: { name: 'Product' } });
  const divOperations = await prisma.division.create({ data: { name: 'Operations' } });
  const divFinance = await prisma.division.create({ data: { name: 'Finance' } });
  const divHR = await prisma.division.create({ data: { name: 'Human Resources' } });

  // 4. Leave Types
  await prisma.leaveType.createMany({
    data: [
      { name: 'Cuti Tahunan', annual_quota_days: 12 },
      { name: 'Cuti Sakit', annual_quota_days: 0, requires_attachment: true },
      { name: 'Cuti Melahirkan', annual_quota_days: 90, requires_hr_approval: true },
      { name: 'Cuti Penting', annual_quota_days: 0 },
    ],
  });

  // 5. Users
  const passwordHash = await argon2.hash('password123');

  const hrAdmin = await prisma.user.create({
    data: {
      nik: 'HR001',
      full_name: 'Budi HR',
      email: 'hr@centroabsen.local',
      password_hash: passwordHash,
      role: Role.HrAdmin,
      division_id: divHR.id,
      primary_work_location_id: hq.id,
      work_arrangement: WorkArrangement.Office,
    },
  });

  const finance = await prisma.user.create({
    data: {
      nik: 'FIN001',
      full_name: 'Siti Rahma',
      email: 'finance@centroabsen.local',
      password_hash: passwordHash,
      role: Role.Finance,
      division_id: divFinance.id,
      primary_work_location_id: hq.id,
      work_arrangement: WorkArrangement.Office,
    },
  });

  const manager1 = await prisma.user.create({
    data: {
      nik: 'MGR001',
      full_name: 'Andi Pratama',
      email: 'andi.mgr@centroabsen.local',
      password_hash: passwordHash,
      role: Role.Manager,
      division_id: divProduct.id,
      primary_work_location_id: hq.id,
      work_arrangement: WorkArrangement.Hybrid,
    },
  });

  const employee1 = await prisma.user.create({
    data: {
      nik: 'EMP001',
      full_name: 'Joko Karyawan',
      email: 'joko@centroabsen.local',
      password_hash: passwordHash,
      role: Role.Employee,
      manager_id: manager1.id,
      division_id: divProduct.id,
      primary_work_location_id: hq.id,
      work_arrangement: WorkArrangement.Flexible,
    },
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
