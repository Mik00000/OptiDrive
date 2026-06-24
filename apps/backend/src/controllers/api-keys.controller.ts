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

    const { prisma } = await import('../config/prisma');
    const { PLANS, PlanType } = await import('@optidrive/shared');

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { plan: true, _count: { select: { apiKeys: true } } }
    });

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    const planLimits = PLANS[workspace.plan as PlanType] || PLANS.FREE;
    if (workspace._count.apiKeys >= planLimits.maxApiKeys) {
      res.status(403).json({ error: `API Key limit reached for your plan (${planLimits.maxApiKeys}). Please upgrade to add more keys.` });
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

    // Create Activity Log
    import('../config/prisma').then(({ prisma }) => {
      prisma.activityLog.create({
        data: {
          type: 'KEY_GENERATED',
          description: `Created API key: ${name}`,
          workspaceId,
          userId: req.user?.id || null,
        }
      }).catch(console.error);
    });

    res.status(201).json({ key: mappedKey, rawToken: result.rawToken });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate API key' });
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
  } catch (error: unknown) {
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Failed to get API keys' });
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

    // Create Activity Log
    import('../config/prisma').then(({ prisma }) => {
      prisma.activityLog.create({
        data: {
          type: 'KEY_REVOKED',
          description: `Revoked an API key`,
          workspaceId,
          userId: req.user?.id || null,
        }
      }).catch(console.error);
    });

    res.status(200).json({ success: true });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to revoke API key' });
  }
};
