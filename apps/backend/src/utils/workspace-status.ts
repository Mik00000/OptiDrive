import { prisma } from '../config/prisma';
import { PLANS, PlanType } from '@optidrive/shared';

/**
 * Перевіряє, чи є робочий простір замороженим (Locked) через перевищення ліміту безкоштовних слотів.
 * Користувач може мати лише 1 активний безкоштовний (FREE) воркспейс.
 * Якщо безкоштовних воркспейсів кілька, активним залишається лише найперший (найстаріший за createdAt).
 * 
 * @param workspaceId ID робочого простору
 * @returns true, якщо воркспейс заморожено, false в іншому випадку
 */
export async function isWorkspaceLocked(workspaceId: string): Promise<boolean> {
  try {
    // 1. Перевіряємо план поточного воркспейсу
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { plan: true }
    });

    // Платні воркспейси ніколи не блокуються за цим лімітом
    if (!workspace || workspace.plan !== 'FREE') {
      return false;
    }

    // 2. Знаходимо власника (Owner) поточного воркспейсу
    const ownerMembership = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId,
        role: { name: 'Owner', isSystem: true }
      },
      select: { userId: true }
    });

    if (!ownerMembership) {
      // Якщо раптом немає власника — не блокуємо
      return false;
    }

    // 3. Знаходимо всі FREE воркспейси, що належать цьому ж власнику
    const ownedFreeWorkspaces = await prisma.workspaceUser.findMany({
      where: {
        userId: ownerMembership.userId,
        role: { name: 'Owner', isSystem: true },
        workspace: { plan: 'FREE' }
      },
      select: { workspaceId: true },
      orderBy: {
        workspace: { createdAt: 'asc' } // Від найстарішого до найновішого
      }
    });

    // Якщо безкоштовний воркспейс лише один, він не є замороженим
    if (ownedFreeWorkspaces.length <= 1) {
      return false;
    }

    // Active FREE workspace is the oldest one (first in the list)
    const activeFreeWorkspaceId = ownedFreeWorkspaces[0]?.workspaceId;

    // All other FREE workspaces are locked
    return workspaceId !== activeFreeWorkspaceId;
  } catch (error) {
    console.error(`[isWorkspaceLocked] Error checking status for workspace ${workspaceId}:`, error);
    return false;
  }
}

/**
 * Отримує дійсні ліміти воркспейсу з урахуванням сплати підписки,
 * Enterprise кастомізацій та пільгового періоду (grace period).
 */
export async function getWorkspacePlanLimits(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      plan: true,
      subscriptionStatus: true,
      gracePeriodStartedAt: true,
      enterpriseStorageBytes: true,
      enterpriseBandwidthBytes: true,
      enterpriseOptimizations: true,
      storageBonusBytes: true,
    }
  });

  if (!workspace) {
    return {
      limits: PLANS.FREE,
      isPaid: false,
      plan: 'FREE' as PlanType,
    };
  }

  const hasActiveGracePeriod = (
    (workspace.subscriptionStatus === 'past_due' || workspace.subscriptionStatus === 'unpaid') &&
    workspace.gracePeriodStartedAt &&
    (Date.now() - new Date(workspace.gracePeriodStartedAt).getTime() < 3 * 24 * 60 * 60 * 1000)
  );

  const isSubscriptionPaid = workspace.plan === 'FREE' || workspace.subscriptionStatus === 'active' || !!hasActiveGracePeriod;
  const effectivePlanLimits = isSubscriptionPaid ? (PLANS[workspace.plan as PlanType] || PLANS.FREE) : PLANS.FREE;

  const limits = { ...effectivePlanLimits };

  // Add custom limits for Enterprise if subscription is paid/valid
  if (workspace.plan === 'ENTERPRISE' && isSubscriptionPaid) {
    if (workspace.enterpriseStorageBytes !== null) {
      limits.storageBytes = Number(workspace.enterpriseStorageBytes);
    }
    if (workspace.enterpriseBandwidthBytes !== null) {
      limits.bandwidthBytes = Number(workspace.enterpriseBandwidthBytes);
    }
    if (workspace.enterpriseOptimizations !== null) {
      limits.monthlyOptimizations = workspace.enterpriseOptimizations;
    }
  }

  // Add admin storage bonus if any
  if (workspace.storageBonusBytes) {
    limits.storageBytes += Number(workspace.storageBonusBytes);
  }

  return {
    limits,
    isPaid: isSubscriptionPaid,
    plan: (isSubscriptionPaid ? workspace.plan : 'FREE') as PlanType,
  };
}
