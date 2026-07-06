import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/prisma';

/**
 * POST /api/internal/billing/enterprise-request
 * Зберігає запит на Enterprise-план та сповіщає адміна
 */
export const createEnterpriseRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user!.workspaceId;
    const userId = req.user!.userId;

    // Захист від спаму: обмежуємо частоту надсилання запитів (мінімум 30 секунд між запитами з одного воркспейсу)
    const lastRequest = await prisma.enterpriseRequest.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });

    if (lastRequest && (Date.now() - new Date(lastRequest.createdAt).getTime() < 30000)) {
      res.status(429).json({
        error: 'Please wait at least 30 seconds before submitting another request.',
      });
      return;
    }

    const {
      contactName,
      contactEmail,
      companyName,
      expectedStorage,
      expectedTraffic,
      expectedOptimizations,
      teamSize,
      message,
    } = req.body;

    // Валідація обов'язкових полів
    if (!contactName || !contactEmail || !expectedStorage || !expectedTraffic) {
      res.status(400).json({
        error: 'Missing required fields: contactName, contactEmail, expectedStorage, expectedTraffic',
      });
      return;
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    // Скасовуємо попередні активні заявки, якщо вони були, щоб нова заявка замінила їх
    await prisma.enterpriseRequest.updateMany({
      where: {
        workspaceId,
        status: { in: ['PENDING', 'CONTACTED', 'APPROVED'] },
      },
      data: {
        status: 'DECLINED',
        adminNotes: 'Superseded by a new enterprise request.',
      },
    });

    // Зберігаємо запит в БД
    const enterpriseRequest = await prisma.enterpriseRequest.create({
      data: {
        workspaceId,
        contactName,
        contactEmail,
        companyName: companyName || null,
        expectedStorage,
        expectedTraffic,
        expectedOptimizations: expectedOptimizations || null,
        teamSize: teamSize || null,
        message: message || null,
      },
    });

    // Логуємо в журнал активності
    await prisma.activityLog.create({
      data: {
        type: 'SETTING_CHANGED',
        description: `Enterprise plan request submitted by ${contactName} (${contactEmail})`,
        workspaceId,
        userId,
      },
    });

    // Відправляємо email адміну
    try {
      const { sendEnterpriseRequestEmail } = await import('../services/email.service');
      await sendEnterpriseRequestEmail({
        requestId: enterpriseRequest.id,
        workspaceId,
        workspaceName: workspace.name,
        contactName,
        contactEmail,
        companyName,
        expectedStorage,
        expectedTraffic,
        expectedOptimizations: expectedOptimizations || undefined,
        teamSize,
        message,
      });
    } catch (emailError: any) {
      // Email-помилка не блокує відповідь — заявку вже збережено
      console.error('[Enterprise] Failed to send admin notification email:', emailError.message);
    }

    res.json({
      success: true,
      message: 'Your Enterprise request has been submitted. Our team will contact you within 24 hours.',
      requestId: enterpriseRequest.id,
    });
  } catch (error: any) {
    console.error('[Enterprise] Error creating enterprise request:', error);
    res.status(500).json({ error: error.message || 'Failed to submit enterprise request' });
  }
};

/**
 * GET /api/internal/billing/enterprise-request/status
 * Повертає статус поточного Enterprise-запиту воркспейсу
 */
export const getEnterpriseRequestStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user!.workspaceId;

    const latestRequest = await prisma.enterpriseRequest.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        contactName: true,
        contactEmail: true,
        approvedStorageGb: true,
        approvedBandwidthGb: true,
        approvedOptimizations: true,
        approvedPrice: true,
        stripePaymentLink: true,
      },
    });

    res.json({
      success: true,
      data: latestRequest || null,
    });
  } catch (error: any) {
    console.error('[Enterprise] Error getting request status:', error);
    res.status(500).json({ error: error.message || 'Failed to get enterprise request status' });
  }
};
