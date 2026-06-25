import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const logs = await prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
  console.log(logs);
}
main().finally(() => prisma.$disconnect());
