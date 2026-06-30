import { prisma } from '../config/prisma';
import { PLANS, PlanType } from '@optidrive/shared';
import { sendQuotaWarningEmail } from './email.service';

export const checkAndTriggerQuotaEmails = async (workspaceId: string): Promise<void> => {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        plan: true,
        storageUsed: true,
        bandwidthUsed: true,
        monthlyOptimizations: true,
        warnedStorage80: true,
        warnedStorage100: true,
        warnedBandwidth80: true,
        warnedBandwidth100: true,
        warnedOptimizations80: true,
        warnedOptimizations100: true
      }
    });

    if (!workspace) return;

    const limits = PLANS[workspace.plan as PlanType] || PLANS.FREE;

    // Percentages
    const storagePercent = Math.round((Number(workspace.storageUsed) / Number(limits.storageBytes)) * 100);
    const bandwidthPercent = Math.round((Number(workspace.bandwidthUsed) / Number(limits.bandwidthBytes)) * 100);
    const optimizationsPercent = Math.round((workspace.monthlyOptimizations / limits.monthlyOptimizations) * 100);

    // Track database updates
    const updates: any = {};
    let shouldUpdateDb = false;

    // Helper: format bytes
    const formatGb = (bytes: bigint | number) => `${(Number(bytes) / (1024 * 1024 * 1024)).toFixed(2)} GB`;

    // Fetch owners/admins who enabled email warning notifications
    const getAlertRecipients = async () => {
      const workspaceUsers = await prisma.workspaceUser.findMany({
        where: {
          workspaceId,
          role: {
            name: { in: ['Owner', 'Admin'] }
          }
        },
        include: {
          user: {
            select: {
              email: true,
              emailQuotaWarnings: true
            }
          }
        }
      });
      return workspaceUsers
        .map(wu => wu.user)
        .filter(u => u && u.emailQuotaWarnings);
    };

    // 1. Storage Checks
    if (storagePercent >= 100) {
      if (!workspace.warnedStorage100) {
        const recipients = await getAlertRecipients();
        for (const recipient of recipients) {
          await sendQuotaWarningEmail(
            recipient.email,
            workspace.name,
            'storage',
            100,
            formatGb(workspace.storageUsed),
            formatGb(limits.storageBytes)
          );
        }
        updates.warnedStorage100 = true;
        updates.warnedStorage80 = true;
        shouldUpdateDb = true;
      }
    } else if (storagePercent >= 80) {
      if (!workspace.warnedStorage80) {
        const recipients = await getAlertRecipients();
        for (const recipient of recipients) {
          await sendQuotaWarningEmail(
            recipient.email,
            workspace.name,
            'storage',
            80,
            formatGb(workspace.storageUsed),
            formatGb(limits.storageBytes)
          );
        }
        updates.warnedStorage80 = true;
        shouldUpdateDb = true;
      }
      if (workspace.warnedStorage100) {
        updates.warnedStorage100 = false;
        shouldUpdateDb = true;
      }
    } else {
      // Storage fell below 80% (files deleted)
      if (workspace.warnedStorage80 || workspace.warnedStorage100) {
        updates.warnedStorage80 = false;
        updates.warnedStorage100 = false;
        shouldUpdateDb = true;
      }
    }

    // 2. Bandwidth Checks
    if (bandwidthPercent >= 100) {
      if (!workspace.warnedBandwidth100) {
        const recipients = await getAlertRecipients();
        for (const recipient of recipients) {
          await sendQuotaWarningEmail(
            recipient.email,
            workspace.name,
            'bandwidth',
            100,
            formatGb(workspace.bandwidthUsed),
            formatGb(limits.bandwidthBytes)
          );
        }
        updates.warnedBandwidth100 = true;
        updates.warnedBandwidth80 = true;
        shouldUpdateDb = true;
      }
    } else if (bandwidthPercent >= 80) {
      if (!workspace.warnedBandwidth80) {
        const recipients = await getAlertRecipients();
        for (const recipient of recipients) {
          await sendQuotaWarningEmail(
            recipient.email,
            workspace.name,
            'bandwidth',
            80,
            formatGb(workspace.bandwidthUsed),
            formatGb(limits.bandwidthBytes)
          );
        }
        updates.warnedBandwidth80 = true;
        shouldUpdateDb = true;
      }
      if (workspace.warnedBandwidth100) {
        updates.warnedBandwidth100 = false;
        shouldUpdateDb = true;
      }
    } else {
      if (workspace.warnedBandwidth80 || workspace.warnedBandwidth100) {
        updates.warnedBandwidth80 = false;
        updates.warnedBandwidth100 = false;
        shouldUpdateDb = true;
      }
    }

    // 3. Optimizations Checks
    if (optimizationsPercent >= 100) {
      if (!workspace.warnedOptimizations100) {
        const recipients = await getAlertRecipients();
        for (const recipient of recipients) {
          await sendQuotaWarningEmail(
            recipient.email,
            workspace.name,
            'optimizations',
            100,
            String(workspace.monthlyOptimizations),
            String(limits.monthlyOptimizations)
          );
        }
        updates.warnedOptimizations100 = true;
        updates.warnedOptimizations80 = true;
        shouldUpdateDb = true;
      }
    } else if (optimizationsPercent >= 80) {
      if (!workspace.warnedOptimizations80) {
        const recipients = await getAlertRecipients();
        for (const recipient of recipients) {
          await sendQuotaWarningEmail(
            recipient.email,
            workspace.name,
            'optimizations',
            80,
            String(workspace.monthlyOptimizations),
            String(limits.monthlyOptimizations)
          );
        }
        updates.warnedOptimizations80 = true;
        shouldUpdateDb = true;
      }
      if (workspace.warnedOptimizations100) {
        updates.warnedOptimizations100 = false;
        shouldUpdateDb = true;
      }
    } else {
      if (workspace.warnedOptimizations80 || workspace.warnedOptimizations100) {
        updates.warnedOptimizations80 = false;
        updates.warnedOptimizations100 = false;
        shouldUpdateDb = true;
      }
    }

    if (shouldUpdateDb) {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: updates
      });
    }

  } catch (error) {
    console.error('checkAndTriggerQuotaEmails Error:', error);
  }
};
