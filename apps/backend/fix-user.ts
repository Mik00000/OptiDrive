import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findUnique({ where: { email: 'mikjarkov@gmail.com' } });
  if (!user) return;
  const workspaces = await prisma.workspace.findMany();
  console.log('Workspaces:', workspaces);
  const userWorkspaces = await prisma.workspaceUser.findMany({ where: { userId: user.id } });
  console.log('User workspaces:', userWorkspaces);
  
  if (workspaces.length > 0 && userWorkspaces.length === 0) {
      await prisma.user.update({ where: { id: user.id }, data: { activeWorkspaceId: workspaces[0].id } });
      let ownerRole = await prisma.role.findFirst({
        where: { isSystem: true, name: 'Owner' }
      });
      if (!ownerRole) {
        ownerRole = await prisma.role.create({
            data: {
                name: 'Owner',
                isSystem: true,
                permissions: [],
                workspaceId: workspaces[0].id,
                level: 1
            }
        });
      }
      await prisma.workspaceUser.create({
        data: {
          userId: user.id,
          workspaceId: workspaces[0].id,
          roleId: ownerRole.id
        }
      });
      console.log('Linked to first workspace');
  }
}

run().finally(() => prisma.$disconnect());
