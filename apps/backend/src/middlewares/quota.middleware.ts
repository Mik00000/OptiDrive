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
      select: {
        plan: true,
        monthlyOptimizations: true,
        storageUsed: true,
        bandwidthUsed: true,
        enterpriseStorageBytes: true,
        enterpriseBandwidthBytes: true,
        enterpriseOptimizations: true,
        subscriptionStatus: true,
        gracePeriodStartedAt: true,
      }
    });

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    // Перевіряємо чи підписка є оплаченою/активною (FREE є безкоштовним, тому завжди активний)
    // Грейс-період: підписка вважається оплаченою протягом 3-х днів після початку прострочення платежу
    const hasActiveGracePeriod = (
      (workspace.subscriptionStatus === 'past_due' || workspace.subscriptionStatus === 'unpaid') &&
      workspace.gracePeriodStartedAt &&
      (Date.now() - new Date(workspace.gracePeriodStartedAt).getTime() < 3 * 24 * 60 * 60 * 1000)
    );
    const isSubscriptionPaid = workspace.plan === 'FREE' || workspace.subscriptionStatus === 'active' || !!hasActiveGracePeriod;
    const effectivePlanLimits = isSubscriptionPaid ? (PLANS[workspace.plan as PlanType] || PLANS.FREE) : PLANS.FREE;

    // Визначаємо ефективні ліміти (з урахуванням кастомних Enterprise-лімітів)
    const storageLimit = (workspace.plan === 'ENTERPRISE' && isSubscriptionPaid && workspace.enterpriseStorageBytes !== null)
      ? workspace.enterpriseStorageBytes
      : BigInt(effectivePlanLimits.storageBytes);

    const bandwidthLimit = (workspace.plan === 'ENTERPRISE' && isSubscriptionPaid && workspace.enterpriseBandwidthBytes !== null)
      ? workspace.enterpriseBandwidthBytes
      : BigInt(effectivePlanLimits.bandwidthBytes);

    const optimizationsLimit = (workspace.plan === 'ENTERPRISE' && isSubscriptionPaid && workspace.enterpriseOptimizations !== null)
      ? workspace.enterpriseOptimizations
      : effectivePlanLimits.monthlyOptimizations;

    // Check Optimizations Limit
    if (workspace.monthlyOptimizations >= optimizationsLimit) {
      res.status(402).json({ error: 'Monthly optimizations limit reached. Please upgrade your plan.' });
      return;
    }

    // Check Storage Limit
    if (workspace.storageUsed >= storageLimit) {
      res.status(402).json({ error: 'Storage limit reached. Please upgrade your plan or delete some files.' });
      return;
    }

    // Check Bandwidth Limit
    if (workspace.bandwidthUsed >= bandwidthLimit) {
      res.status(402).json({ error: 'Bandwidth limit reached. Please upgrade your plan.' });
      return;
    }

    // Attach limits to request if needed by controller (e.g. for maxFileSize check)
    const effectiveLimits = {
      ...effectivePlanLimits,
      storageBytes: Number(storageLimit),
      bandwidthBytes: Number(bandwidthLimit),
      monthlyOptimizations: optimizationsLimit,
    };
    (req as any).planLimits = effectiveLimits;

    next();
  } catch (error) {
    console.error('Quota Check Error:', error);
    res.status(500).json({ error: 'Failed to verify quota limits' });
  }
};

