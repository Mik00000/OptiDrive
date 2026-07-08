import { Response } from 'express';
import { prisma } from '../../config/prisma';

export const getWorkspaceAnalyticsV1Controller = async (req: any, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized: No workspace context' });
      return;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const logsLast30Days = await prisma.analyticsLog.findMany({
      where: {
        workspaceId,
        timestamp: { gte: thirtyDaysAgo }
      },
      select: {
        statusCode: true,
        timestamp: true,
        bytesSaved: true,
      },
      orderBy: { timestamp: 'asc' }
    });

    const dailyStats: { [dateStr: string]: { bytesSaved: number; successCount: number; errorCount: number } } = {};
    
    // Initialize 30 days
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0]!;
      dailyStats[dateStr] = { bytesSaved: 0, successCount: 0, errorCount: 0 };
    }

    let totalBytesSaved = BigInt(0);
    let totalSuccess = 0;
    let totalErrors = 0;

    for (const log of logsLast30Days) {
      const dateStr = log.timestamp.toISOString().split('T')[0]!;
      if (!dailyStats[dateStr]) continue;

      const isSuccess = log.statusCode >= 200 && log.statusCode < 300;
      if (isSuccess) {
        dailyStats[dateStr].successCount += 1;
        dailyStats[dateStr].bytesSaved += Number(log.bytesSaved);
        totalSuccess += 1;
        totalBytesSaved += log.bytesSaved;
      } else {
        dailyStats[dateStr].errorCount += 1;
        totalErrors += 1;
      }
    }

    // Map to array format for easy usage
    const dailyAnalyticsArray = Object.keys(dailyStats).map((date) => ({
      date,
      ...dailyStats[date]
    }));

    res.json({
      success: true,
      data: {
        periodDays: 30,
        totals: {
          successRequests: totalSuccess,
          errorRequests: totalErrors,
          totalRequests: totalSuccess + totalErrors,
          bytesSaved: totalBytesSaved.toString(),
        },
        daily: dailyAnalyticsArray
      }
    });
  } catch (error: any) {
    console.error('getWorkspaceAnalyticsV1Controller Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
