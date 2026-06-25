import { prisma } from '../config/prisma';
import { createDefaultRolesForWorkspace } from '../services/role.service';

export const findUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({
    where: { email },
  });
};

export const createUserWithWorkspace = async (email: string, passwordHash: string, name: string, verificationCode?: string, verificationCodeExpiry?: Date) => {
  const slug = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

  // 1. Create workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: `${name}'s Workspace`,
      slug: slug,
    }
  });

  // 2. Create default roles for this workspace
  const roles = await createDefaultRolesForWorkspace(workspace.id);
  const ownerRole = roles.find(r => r.name === 'Owner');

  if (!ownerRole) {
    throw new Error('Failed to create default roles');
  }

  // 3. Create user
  return await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      emailVerified: false,
      verificationCode: verificationCode ?? null,
      verificationCodeExpiry: verificationCodeExpiry ?? null,
      activeWorkspaceId: workspace.id,
      workspaces: {
        create: {
          workspaceId: workspace.id,
          roleId: ownerRole.id
        }
      }
    },
    include: {
      workspaces: {
        include: {
          workspace: true,
          role: true
        }
      }
    },
  });
};

export const updateUserVerification = async (userId: string) => {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerified: true,
      verificationCode: null,
      verificationCodeExpiry: null,
    },
  });
};