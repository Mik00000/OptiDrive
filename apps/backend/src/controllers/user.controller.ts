import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getUserNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailWeeklySummary: true,
        emailQuotaWarnings: true,
        emailSecurityAlerts: true,
        emailBillingAlerts: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('getUserNotifications Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateUserNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      emailWeeklySummary,
      emailQuotaWarnings,
      emailSecurityAlerts,
      emailBillingAlerts
    } = req.body;

    const updateData: any = {};
    if (emailWeeklySummary !== undefined) updateData.emailWeeklySummary = Boolean(emailWeeklySummary);
    if (emailQuotaWarnings !== undefined) updateData.emailQuotaWarnings = Boolean(emailQuotaWarnings);
    if (emailSecurityAlerts !== undefined) updateData.emailSecurityAlerts = Boolean(emailSecurityAlerts);
    if (emailBillingAlerts !== undefined) updateData.emailBillingAlerts = Boolean(emailBillingAlerts);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        emailWeeklySummary: true,
        emailQuotaWarnings: true,
        emailSecurityAlerts: true,
        emailBillingAlerts: true
      }
    });

    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('updateUserNotifications Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
