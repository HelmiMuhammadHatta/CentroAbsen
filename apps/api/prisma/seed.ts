import { PrismaClient, WorkArrangement, Gender } from '@prisma/client';
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

  await prisma.appSetting.upsert({
    where: { key: 'finance_ceo_threshold_idr' },
    update: {},
    create: { key: 'finance_ceo_threshold_idr', value: '0' },
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

  // 3. Departments
  const divProduct = await prisma.department.create({ data: { name: 'Product' } });
  const divOperations = await prisma.department.create({ data: { name: 'Operations' } });
  const divFinance = await prisma.department.create({ data: { name: 'Finance' } });
  const divHR = await prisma.department.create({ data: { name: 'Human Resources' } });
  const divExec = await prisma.department.create({ data: { name: 'Executive' } });

  // 4. Leave Types
  await prisma.leaveType.createMany({
    data: [
      { name: 'Cuti Tahunan', annual_quota_days: 12 },
      { name: 'Cuti Sakit', annual_quota_days: 0, requires_attachment: true },
      { name: 'Cuti Melahirkan', annual_quota_days: 90, requires_hr_approval: true, eligible_gender: Gender.Female },
      { name: 'Cuti Penting', annual_quota_days: 0 },
    ],
  });

  // 5. Roles & Permissions (Based on EMS + Tahap 6)
  const permissions = [
    'employee.read', 'employee.create', 'employee.update', 'employee.delete',
    'leave.read', 'leave.create', 'leave.approve',
    'finance.read', 'finance.create', 'finance.approve',
    'finance.approve.manager', 'finance.approve.executive', 'finance.disburse', 'finance.reassign',
    'attendance.read', 'attendance.create', 'attendance.report'
  ];
  
  await prisma.permission.createMany({
    data: permissions.map(p => ({ name: p })),
    skipDuplicates: true,
  });

  const dbPerms = await prisma.permission.findMany();
  const getPermIds = (names: string[]) => dbPerms.filter(p => names.includes(p.name)).map(p => ({ permission_id: p.id }));

  const roleEmployee = await prisma.role.create({
    data: {
      name: 'Employee',
      permissions: { create: getPermIds(['employee.read', 'leave.read', 'leave.create', 'finance.read', 'finance.create', 'attendance.read', 'attendance.create']) }
    }
  });

  const roleManager = await prisma.role.create({
    data: {
      name: 'Manager',
      permissions: { create: getPermIds(['employee.read', 'leave.read', 'leave.create', 'leave.approve', 'finance.read', 'finance.create', 'finance.approve', 'finance.approve.manager', 'attendance.read', 'attendance.create']) }
    }
  });

  const roleExecutive = await prisma.role.create({
    data: {
      name: 'Executive',
      permissions: { create: getPermIds(['employee.read', 'leave.read', 'leave.approve', 'finance.read', 'finance.approve', 'finance.approve.executive', 'attendance.read']) }
    }
  });

  const roleFinance = await prisma.role.create({
    data: {
      name: 'Finance',
      permissions: { create: getPermIds(['employee.read', 'finance.read', 'finance.approve', 'finance.disburse', 'attendance.read']) }
    }
  });

  const roleHrAdmin = await prisma.role.create({
    data: {
      name: 'HrAdmin',
      permissions: { create: getPermIds(permissions) }
    }
  });

  // 6. Users
  const passwordHash = await argon2.hash('password123');

  const ceo = await prisma.user.create({
    data: {
      nik: 'CEO001',
      full_name: 'Hatta CEO',
      email: 'ceo@centroabsen.local',
      password_hash: passwordHash,
      department_id: divExec.id,
      primary_work_location_id: hq.id,
      work_arrangement: WorkArrangement.Office,
      roles: { create: [{ role_id: roleExecutive.id }] }
    }
  });

  await prisma.appSetting.upsert({
    where: { key: 'finance_ceo_user_id' },
    update: { value: ceo.id },
    create: { key: 'finance_ceo_user_id', value: ceo.id },
  });

  const hrAdmin = await prisma.user.create({
    data: {
      nik: 'HR001',
      full_name: 'Budi HR',
      email: 'hr@centroabsen.local',
      password_hash: passwordHash,
      department_id: divHR.id,
      primary_work_location_id: hq.id,
      work_arrangement: WorkArrangement.Office,
      roles: { create: [{ role_id: roleHrAdmin.id }] }
    },
  });

  const finance = await prisma.user.create({
    data: {
      nik: 'FIN001',
      full_name: 'Siti Rahma',
      email: 'finance@centroabsen.local',
      password_hash: passwordHash,
      department_id: divFinance.id,
      primary_work_location_id: hq.id,
      work_arrangement: WorkArrangement.Office,
      roles: { create: [{ role_id: roleFinance.id }] }
    },
  });

  const manager1 = await prisma.user.create({
    data: {
      nik: 'MGR001',
      full_name: 'Andi Pratama',
      email: 'andi.mgr@centroabsen.local',
      password_hash: passwordHash,
      manager_id: ceo.id,
      department_id: divProduct.id,
      primary_work_location_id: hq.id,
      work_arrangement: WorkArrangement.Hybrid,
      roles: { create: [{ role_id: roleManager.id }] }
    },
  });

  const employee1 = await prisma.user.create({
    data: {
      nik: 'EMP001',
      full_name: 'Joko Karyawan',
      email: 'joko@centroabsen.local',
      password_hash: passwordHash,
      manager_id: manager1.id,
      department_id: divProduct.id,
      primary_work_location_id: hq.id,
      work_arrangement: WorkArrangement.Flexible,
      roles: { create: [{ role_id: roleEmployee.id }] }
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
