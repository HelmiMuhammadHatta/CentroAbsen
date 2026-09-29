import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const leaves = await prisma.leaveType.findMany();
  console.log("LEAVES:", leaves.length);
  if (leaves.length === 0) {
    console.log("Seeding leaves...");
    await prisma.leaveType.createMany({
      data: [
        { name: 'Cuti Tahunan', annual_quota_days: 12 },
        { name: 'Cuti Sakit', annual_quota_days: 0, requires_attachment: true },
        { name: 'Cuti Melahirkan', annual_quota_days: 90, requires_hr_approval: true },
        { name: 'Cuti Menikah', annual_quota_days: 3 },
        { name: 'Cuti Penting', annual_quota_days: 0 },
      ],
    });
    console.log("Seeded leaves!");
  }
}
main().then(() => prisma.$disconnect());
