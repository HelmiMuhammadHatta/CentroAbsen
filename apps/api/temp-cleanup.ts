import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const leaves = await prisma.leaveType.findMany();
  const seen = new Set();
  for (const leave of leaves) {
    if (seen.has(leave.name)) {
      await prisma.leaveType.delete({ where: { id: leave.id } });
      console.log(`Deleted duplicate: ${leave.name}`);
    } else {
      seen.add(leave.name);
    }
  }
}
main().then(() => prisma.$disconnect());
