import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { PLANS, PlanType } from '@optidrive/shared';

export const checkQuota = async (req: Request & { workspaceId?: string; user?: { workspaceId: string } }, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized: No workspace context' });
      return;
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { plan: true, monthlyOptimizations: true, storageUsed: true, bandwidthUsed: true }
    });

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    const limits = PLANS[workspace.plan as PlanType] || PLANS.FREE;

    // Check Optimizations Limit
    if (workspace.monthlyOptimizations >= limits.monthlyOptimizations) {
      res.status(402).json({ error: 'Monthly optimizations limit reached. Please upgrade your plan.' });
      return;
    }

    // Check Storage Limit
    if (workspace.storageUsed >= BigInt(limits.storageBytes)) {
      res.status(402).json({ error: 'Storage limit reached. Please upgrade your plan or delete some files.' });
      return;
    }

    // Check Bandwidth Limit
    if (workspace.bandwidthUsed >= BigInt(limits.bandwidthBytes)) {
      res.status(402).json({ error: 'Bandwidth limit reached. Please upgrade your plan.' });
      return;
    }

    // Attach limits to request if needed by controller (e.g. for maxFileSize check)
    (req as any).planLimits = limits;

    next();
  } catch (error) {
    console.error('Quota Check Error:', error);
    res.status(500).json({ error: 'Failed to verify quota limits' });
  }
};

