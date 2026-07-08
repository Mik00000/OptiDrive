import { Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { getWorkspacePlanLimits } from '../../utils/workspace-status';

export const listWebhooksV1Controller = async (req: any, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ success: false, error: 'Unauthorized: No workspace context' });
      return;
    }

    const webhooks = await prisma.webhook.findMany({
      where: { workspaceId }
    });

    res.json({ success: true, data: webhooks });
  } catch (error) {
    console.error('listWebhooksV1Controller error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch webhooks' });
  }
};

export const createWebhookV1Controller = async (req: any, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ success: false, error: 'Unauthorized: No workspace context' });
      return;
    }

    const { name, url, events } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ success: false, error: 'Webhook name is required' });
      return;
    }

    // Check plan limits
    const { limits: planLimits, plan: effectivePlan } = await getWorkspacePlanLimits(workspaceId);

    const webhooksCount = await prisma.webhook.count({
      where: { workspaceId }
    });

    if (webhooksCount >= planLimits.maxWebhooks) {
      res.status(403).json({
        success: false,
        error: `Webhook limit reached for your ${effectivePlan} plan (${planLimits.maxWebhooks} webhooks). Please upgrade your plan.`
      });
      return;
    }

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      res.status(400).json({ success: false, error: 'A valid webhook URL starting with http/https is required' });
      return;
    }

    if (!Array.isArray(events) || events.length === 0) {
      res.status(400).json({ success: false, error: 'At least one webhook event is required' });
      return;
    }

    const secret = 'whsec_' + crypto.randomBytes(24).toString('hex');

    const webhook = await prisma.webhook.create({
      data: {
        name,
        url,
        secret,
        events,
        workspaceId,
        isActive: true
      }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        type: 'SETTING_CHANGED',
        description: `Created webhook endpoint "${webhook.name}" (${webhook.url}) via API`,
        workspaceId,
        userId: req.user?.userId || null,
      }
    });

    res.status(201).json({ success: true, data: webhook });
  } catch (error) {
    console.error('createWebhookV1Controller error:', error);
    res.status(500).json({ success: false, error: 'Failed to create webhook' });
  }
};

export const deleteWebhookV1Controller = async (req: any, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ success: false, error: 'Unauthorized: No workspace context' });
      return;
    }

    const { id } = req.params;

    const webhook = await prisma.webhook.findFirst({
      where: { id, workspaceId }
    });

    if (!webhook) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }

    await prisma.webhook.delete({
      where: { id }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        type: 'SETTING_CHANGED',
        description: `Deleted webhook endpoint "${webhook.name}" via API`,
        workspaceId,
        userId: req.user?.userId || null,
      }
    });

    res.json({ success: true, message: 'Webhook deleted successfully' });
  } catch (error) {
    console.error('deleteWebhookV1Controller error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete webhook' });
  }
};
