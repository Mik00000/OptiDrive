import crypto from 'crypto';
import { ApiKeyRepository } from '../repositories/api-keys.repository';
import { KeyPermission } from '@prisma/client';

const apiKeyRepository = new ApiKeyRepository();

export class ApiKeyService {
  async generateKey(name: string, permission: KeyPermission, workspaceId: string) {
    // Генеруємо випадковий токен (безпечний)
    const randomBytes = crypto.randomBytes(24).toString('base64url');
    const prefix = permission === KeyPermission.READ_ONLY ? 'op_test_' : 'op_live_';
    const rawToken = `${prefix}${randomBytes}`;

    // Хешуємо для безпечного збереження в БД
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Створюємо маскований варіант для UI (напр., op_live_••••••••xyz1)
    const suffix = rawToken.slice(-4);
    const maskedToken = `${prefix}••••••••${suffix}`;

    // Зберігаємо в БД
    const newKey = await apiKeyRepository.create({
      name,
      tokenHash,
      maskedToken,
      permissions: permission,
      workspaceId,
    });

    // Повертаємо rawToken тільки один раз при створенні!
    return {
      key: newKey,
      rawToken, 
    };
  }

  async getKeys(workspaceId: string) {
    return await apiKeyRepository.findByWorkspaceId(workspaceId);
  }

  async revokeKey(id: string, workspaceId: string) {
    return await apiKeyRepository.deleteById(id, workspaceId);
  }
}
