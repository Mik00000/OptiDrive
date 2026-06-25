import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findUnique({ where: { email: 'mikjarkov@gmail.com' } });
  if (!user) return;
  const targetWorkspace = 'cmqkoljre0001wou2hwcrwhvw'; // Mik's Workspace
  
  await prisma.user.update({ where: { id: user.id }, data: { activeWorkspaceId: targetWorkspace } });
  
  let ownerRole = await prisma.role.findFirst({
    where: { isSystem: true, name: 'Owner', workspaceId: targetWorkspace }
  });
  
  if (!ownerRole) {
      ownerRole = await prisma.role.findFirst({
        where: { isSystem: true, name: 'Owner' }
      });
  }

  const existingLink = await prisma.workspaceUser.findFirst({
    where: { userId: user.id, workspaceId: targetWorkspace }
  });
  
  if (!existingLink && ownerRole) {
      await prisma.workspaceUser.create({
        data: {
          userId: user.id,
          workspaceId: targetWorkspace,
          roleId: ownerRole.id
        }
      });
  }
  
  console.log('Linked to second workspace (Mik\'s Workspace)');
}

run().finally(() => prisma.$disconnect());
