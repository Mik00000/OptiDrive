import { Response } from 'express';
import { ApiKeyService } from '../services/api-keys.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { KeyPermission } from '@prisma/client';

const apiKeyService = new ApiKeyService();

export const createApiKey = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { name, permissions } = req.body;
    const workspaceId = req.user?.workspaceId;

    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!name || !permissions) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Відповідність прав доступу з фронтенду на бекенд
    let keyPermission: KeyPermission;
    switch (permissions) {
      case 'Full Access':
        keyPermission = KeyPermission.FULL_ACCESS;
        break;
      case 'Upload Only':
        keyPermission = KeyPermission.UPLOAD_ONLY;
        break;
      case 'Read-only':
      default:
        keyPermission = KeyPermission.READ_ONLY;
        break;
    }

    const result = await apiKeyService.generateKey(
      name,
      keyPermission,
      workspaceId,
    );

    // Мапимо результат для фронтенду
    const mappedKey = {
      id: result.key.id,
      name: result.key.name,
      token: result.key.maskedToken,
      permissions,
      createdAt: result.key.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }),
      lastUsed: 'Never',
    };

    res.status(201).json({ key: mappedKey, rawToken: result.rawToken });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate API key' });
  }
};

export const getApiKeys = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const keys = await apiKeyService.getKeys(workspaceId);

    // Мапимо дані під UI-тип ApiKey
    const mappedKeys = keys.map((k) => {
      let permissions = 'Read-only';
      if (k.permissions === KeyPermission.FULL_ACCESS)
        permissions = 'Full Access';
      if (k.permissions === KeyPermission.UPLOAD_ONLY)
        permissions = 'Upload Only';

      return {
        id: k.id,
        name: k.name,
        token: k.maskedToken,
        permissions,
        createdAt: k.createdAt.toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        }),
        lastUsed: k.lastUsedAt
          ? k.lastUsedAt.toLocaleDateString('en-US', {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
            })
          : 'Never',
      };
    });

    res.status(200).json(mappedKeys);
  } catch (error: any) {
    res
      .status(500)
      .json({ error: error.message || 'Failed to get API keys' });
  }
};

export const revokeApiKey = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const workspaceId = req.user?.workspaceId;

    if (typeof id !== 'string') {
      res.status(400).json({ error: 'Invalid API key ID format' });
      return;
    }
    
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    await apiKeyService.revokeKey(id, workspaceId);
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to revoke API key' });
  }
};
