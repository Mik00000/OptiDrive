import { PrismaClient, Permission } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const workspaces = await prisma.workspace.findMany();

  for (const workspace of workspaces) {
    const ownerRole = await prisma.role.create({
      data: {
        name: 'Owner',
        description: 'System role for workspace owner',
        isSystem: true,
        workspaceId: workspace.id,
        permissions: Object.values(Permission)
      }
    });

    const adminRole = await prisma.role.create({
      data: {
        name: 'Admin',
        description: 'System role for workspace admin',
        isSystem: true,
        workspaceId: workspace.id,
        permissions: Object.values(Permission)
      }
    });

    const memberRole = await prisma.role.create({
      data: {
        name: 'Member',
        description: 'System role for regular member',
        isSystem: true,
        workspaceId: workspace.id,
        permissions: ['UPLOAD_FILES', 'DELETE_FILES', 'VIEW_ANALYTICS']
      }
    });

    const viewerRole = await prisma.role.create({
      data: {
        name: 'Viewer',
        description: 'System role for viewer',
        isSystem: true,
        workspaceId: workspace.id,
        permissions: ['VIEW_ANALYTICS']
      }
    });

    // Link users. Since we lost the role column in DB, we'll make the first user owner and the rest members.
    const workspaceUsers = await prisma.workspaceUser.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: 'asc' }
    });
    if (workspaceUsers.length > 0) {
      await prisma.workspaceUser.update({
        where: { id: workspaceUsers[0]!.id },
        data: { roleId: ownerRole.id }
      });

      for (let i = 1; i < workspaceUsers.length; i++) {
        await prisma.workspaceUser.update({
          where: { id: workspaceUsers[i]!.id },
          data: { roleId: memberRole.id }
        });
      }
    }
  }

  console.log("Roles seeded and users linked!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
