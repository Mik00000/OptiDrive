import { prisma } from '../config/prisma';

export const findUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({
    where: { email },
  });
};

export const createUserWithWorkspace = async (email: string, passwordHash: string, name: string) => {
  const slug = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

  return await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      workspace: {
        create: {
          name: `${name}'s Workspace`,
          slug: slug,
        },
      },
    },
    include: {
      workspace: true, 
    },
  });
};