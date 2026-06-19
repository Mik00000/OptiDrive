import { prisma } from '../config/prisma';

export const findUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({
    where: { email },
  });
};

export const createUserWithWorkspace = async (email: string, passwordHash: string, name: string, verificationCode?: string, verificationCodeExpiry?: Date) => {
  const slug = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

  return await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      emailVerified: false,
      verificationCode,
      verificationCodeExpiry,
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