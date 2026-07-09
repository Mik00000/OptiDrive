import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const getPublicSystemStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    let dbStatus = 'operational';
    let s3Status = 'operational';
    
    // Check Database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbErr) {
      dbStatus = 'unhealthy';
    }

    // Fetch incidents (both active and past)
    const incidents = await prisma.incident.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Fetch uptime history for the last 40 days
    const fortyDaysAgo = new Date();
    fortyDaysAgo.setUTCDate(fortyDaysAgo.getUTCDate() - 40);
    fortyDaysAgo.setUTCHours(0, 0, 0, 0);

    const uptimeMetrics = await prisma.uptimeMetric.findMany({
      where: {
        date: { gte: fortyDaysAgo }
      },
      orderBy: { date: 'asc' }
    });

    // Build exactly 35 days timeline helper
    const buildUptimeHistory = (serviceKey: string) => {
      const history = [];
      const metricsMap = new Map(
        uptimeMetrics
          .filter(m => m.service === serviceKey)
          .map(m => {
            const dateStr = new Date(m.date).toISOString().split('T')[0];
            return [dateStr, m.uptimePercent];
          })
      );

      for (let i = 34; i >= 0; i--) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        history.push({
          date: dateStr,
          uptimePercent: metricsMap.has(dateStr) ? (metricsMap.get(dateStr) ?? 100.0) : 100.0
        });
      }
      return history;
    };

    res.json({
      success: true,
      status: dbStatus === 'unhealthy' ? 'major_outage' : 'operational',
      timestamp: new Date().toISOString(),
      services: {
        api_gateway: dbStatus,
        compression_engine: dbStatus,
        asset_cdn: 'operational',
        dashboard: 'operational',
      },
      incidents,
      uptimeHistory: {
        api_gateway: buildUptimeHistory('api_gateway'),
        compression_engine: buildUptimeHistory('compression_engine'),
        asset_cdn: buildUptimeHistory('asset_cdn'),
        dashboard: buildUptimeHistory('dashboard'),
      }
    });
  } catch (error: any) {
    console.error('getPublicSystemStatus error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch status details' });
  }
};
