import { Response } from 'express';
import { prisma } from '../../config/prisma';
import { getWorkspacePlanLimits } from '../../utils/workspace-status';

export const getWorkspaceStatsV1Controller = async (req: any, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized: No workspace context' });
      return;
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        storageUsed: true,
        bandwidthUsed: true,
        monthlyOptimizations: true,
        subscriptionStatus: true,
      }
    });

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    const { limits, plan: effectivePlan, isPaid } = await getWorkspacePlanLimits(workspaceId);

    res.json({
      success: true,
      data: {
        workspace: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
        },
        subscription: {
          plan: workspace.plan,
          effectivePlan,
          status: workspace.subscriptionStatus || 'inactive',
          isPaid,
        },
        usage: {
          storageUsedBytes: workspace.storageUsed.toString(),
          bandwidthUsedBytes: workspace.bandwidthUsed.toString(),
          monthlyOptimizations: workspace.monthlyOptimizations,
        },
        limits: {
          storageLimitBytes: limits.storageBytes.toString(),
          bandwidthLimitBytes: limits.bandwidthBytes.toString(),
          monthlyOptimizationsLimit: limits.monthlyOptimizations,
          maxWebhooks: limits.maxWebhooks,
          maxCustomDomains: limits.maxCustomDomains,
          maxApiKeys: limits.maxApiKeys,
        }
      }
    });
  } catch (error: any) {
    console.error('getWorkspaceStatsV1Controller error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getWorkspacePresetsV1Controller = async (req: any, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized: No workspace context' });
      return;
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        defaultPreset: true,
        defaultFormat: true,
        defaultQuality: true,
        defaultStripMetadata: true,
        defaultMaxWidth: true,
        defaultMaxHeight: true,
        defaultFit: true,
        defaultWatermarkText: true,
        defaultWatermarkUrl: true,
      }
    });

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        defaults: {
          preset: workspace.defaultPreset,
          format: workspace.defaultFormat,
          quality: workspace.defaultQuality,
          stripMetadata: workspace.defaultStripMetadata,
          maxWidth: workspace.defaultMaxWidth,
          maxHeight: workspace.defaultMaxHeight,
          fit: workspace.defaultFit,
          watermarkText: workspace.defaultWatermarkText,
          watermarkUrl: workspace.defaultWatermarkUrl,
        },
        availablePresets: [
          { id: 'web_balanced', name: 'Web Balanced', description: 'Optimal compression quality and size' },
          { id: 'ultra_light', name: 'Ultra Light', description: 'Aggressive compression for maximum speed' },
          { id: 'lossless', name: 'Lossless', description: 'High quality with zero optimization degradation' }
        ],
        availableFormats: ['auto', 'jpeg', 'png', 'webp', 'avif']
      }
    });
  } catch (error: any) {
    console.error('getWorkspacePresetsV1Controller error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getApiHealthV1Controller = async (req: any, res: Response): Promise<void> => {
  try {
    // Simple DB ping to confirm connection is healthy
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      workspaceId: req.workspaceId
    });
  } catch (error: any) {
    console.error('getApiHealthV1Controller error:', error);
    res.status(500).json({ success: false, status: 'unhealthy', error: 'Database connection failed' });
  }
};
