import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { prisma } from '../../config/prisma';
import crypto from 'crypto';

export const getWebhooks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.user!;

    const webhooks = await prisma.webhook.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { deliveries: true }
        }
      }
    });

    res.json({ success: true, data: webhooks });
  } catch (error) {
    console.error('getWebhooks error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch webhooks' });
  }
};

export const createWebhook = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.user!;
    const { name, url, events } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ success: false, error: 'Webhook name is required' });
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

    // Тільки дозволені івенти
    const allowedEvents = ['file.optimized', 'file.deleted', 'file.restored', 'folder.created', 'folder.deleted'];
    const hasInvalidEvent = events.some((e: string) => !allowedEvents.includes(e));
    if (hasInvalidEvent) {
      res.status(400).json({ success: false, error: `Invalid events specified. Allowed events: ${allowedEvents.join(', ')}` });
      return;
    }

    // Генерація безпечного унікального секретного ключа для підпису
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

    res.status(201).json({ success: true, data: webhook });
  } catch (error) {
    console.error('createWebhook error:', error);
    res.status(500).json({ success: false, error: 'Failed to create webhook' });
  }
};

export const updateWebhook = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.user!;
    const webhookId = req.params.webhookId as string;
    const { name, url, events, isActive } = req.body;

    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, workspaceId }
    });

    if (!webhook) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }

    if (url !== undefined && (typeof url !== 'string' || !url.startsWith('http'))) {
      res.status(400).json({ success: false, error: 'A valid webhook URL starting with http/https is required' });
      return;
    }

    if (events !== undefined && (!Array.isArray(events) || events.length === 0)) {
      res.status(400).json({ success: false, error: 'At least one webhook event is required' });
      return;
    }

    if (events) {
      const allowedEvents = ['file.optimized', 'file.deleted', 'file.restored', 'folder.created', 'folder.deleted'];
      const hasInvalidEvent = events.some((e: string) => !allowedEvents.includes(e));
      if (hasInvalidEvent) {
        res.status(400).json({ success: false, error: `Invalid events. Allowed events: ${allowedEvents.join(', ')}` });
        return;
      }
    }

    const updatedWebhook = await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        name: name !== undefined ? name : webhook.name,
        url: url !== undefined ? url : webhook.url,
        events: events !== undefined ? events : webhook.events,
        isActive: isActive !== undefined ? !!isActive : webhook.isActive
      }
    });

    res.json({ success: true, data: updatedWebhook });
  } catch (error) {
    console.error('updateWebhook error:', error);
    res.status(500).json({ success: false, error: 'Failed to update webhook' });
  }
};

export const deleteWebhook = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.user!;
    const webhookId = req.params.webhookId as string;

    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, workspaceId }
    });

    if (!webhook) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }

    await prisma.webhook.delete({
      where: { id: webhookId }
    });

    res.json({ success: true, message: 'Webhook deleted successfully' });
  } catch (error) {
    console.error('deleteWebhook error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete webhook' });
  }
};

export const getWebhookDeliveries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.user!;
    const webhookId = req.params.webhookId as string;

    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, workspaceId }
    });

    if (!webhook) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }

    const deliveries = await prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: 50 // Останні 50 доставок
    });

    res.json({ success: true, data: deliveries });
  } catch (error) {
    console.error('getWebhookDeliveries error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch webhook deliveries' });
  }
};

export const testWebhook = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.user!;
    const webhookId = req.params.webhookId as string;
    
    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, workspaceId }
    });

    if (!webhook) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }

    const axios = (await import('axios')).default;
    const crypto = await import('crypto');

    const payload = {
      event: 'test.ping',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test notification from OptiDrive',
        workspaceId,
        test: true
      }
    };

    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(payloadString)
      .digest('hex');

    const startTime = Date.now();
    let status = 0;
    let responseBody = '';
    let success = false;

    try {
      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-OptiDrive-Signature': `sha256=${signature}`,
          'X-OptiDrive-Event': 'test.ping',
        },
        timeout: 5000,
      });

      status = response.status;
      responseBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      success = status >= 200 && status < 300;
    } catch (error: any) {
      if (error.response) {
        status = error.response.status;
        responseBody = typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data);
      } else {
        status = 500;
        responseBody = error.message || 'Unknown network error';
      }
      success = false;
    } finally {
      const duration = Date.now() - startTime;

      const delivery = await prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event: 'test.ping',
          status,
          success,
          payload: payloadString,
          response: responseBody.slice(0, 1000),
          duration,
        },
      });

      res.json({ success, status, duration, response: responseBody.slice(0, 500), delivery });
    }
  } catch (error) {
    console.error('testWebhook error:', error);
    res.status(500).json({ success: false, error: 'Failed to test webhook' });
  }
};
