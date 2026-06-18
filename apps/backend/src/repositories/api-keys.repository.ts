import { prisma } from '../config/prisma';
import { KeyPermission } from '@prisma/client';

export class ApiKeyRepository {
  async create(data: {
    name: string;
    tokenHash: string;
    maskedToken: string;
    permissions: KeyPermission;
    workspaceId: string;
  }) {
    return await prisma.apiKey.create({
      data,
    });
  }

  async findByWorkspaceId(workspaceId: string) {
    return await prisma.apiKey.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteById(id: string, workspaceId: string) {
    const key = await prisma.apiKey.findUnique({ where: { id } });
    if (!key || key.workspaceId !== workspaceId) {
      throw new Error('Ключ не знайдено або немає доступу');
    }
    return await prisma.apiKey.delete({ where: { id } });
  }
}
