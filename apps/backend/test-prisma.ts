import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const workspaces = await prisma.workspace.findMany();
  console.log(workspaces);
}
main().finally(() => prisma.$disconnect());
