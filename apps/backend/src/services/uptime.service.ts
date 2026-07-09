import { prisma } from '../config/prisma';
import { s3Client } from '../config/s3';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';

// Helper to get today's date at midnight UTC
const getTodayDate = (): Date => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// Ping the service dependencies and record metric
const pingServices = async () => {
  const today = getTodayDate();
  
  // 1. API Gateway / Database check
  let dbSuccess = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbSuccess = false;
    console.error('[Uptime Monitor] DB ping failed:', err);
  }

  // 2. Compression Engine / S3 check
  let s3Success = true;
  try {
    // List objects in S3 bucket to verify read connection
    if (process.env.BUCKET_NAME) {
      await s3Client.send(new ListObjectsV2Command({
        Bucket: process.env.BUCKET_NAME,
        MaxKeys: 1,
      }));
    }
  } catch (err) {
    s3Success = false;
    console.error('[Uptime Monitor] S3 ping failed:', err);
  }

  // Record metrics for the 4 core services
  const servicesToCheck = [
    { key: 'api_gateway', success: dbSuccess },
    { key: 'compression_engine', success: dbSuccess && s3Success },
    { key: 'asset_cdn', success: dbSuccess },
    { key: 'dashboard', success: dbSuccess },
  ];

  for (const service of servicesToCheck) {
    try {
      // Find or create metric for today
      const currentMetric = await prisma.uptimeMetric.findUnique({
        where: {
          date_service: {
            date: today,
            service: service.key,
          }
        }
      });

      if (currentMetric) {
        const totalPings = currentMetric.totalPings + 1;
        const successfulPings = currentMetric.successfulPings + (service.success ? 1 : 0);
        const uptimePercent = Math.round((successfulPings / totalPings) * 10000) / 100;

        await prisma.uptimeMetric.update({
          where: { id: currentMetric.id },
          data: {
            totalPings,
            successfulPings,
            uptimePercent,
          }
        });
      } else {
        await prisma.uptimeMetric.create({
          data: {
            date: today,
            service: service.key,
            totalPings: 1,
            successfulPings: service.success ? 1 : 0,
            uptimePercent: service.success ? 100.0 : 0.0,
          }
        });
      }
    } catch (err) {
      console.error(`[Uptime Monitor] Failed to record metric for ${service.key}:`, err);
    }
  }
};

export const startUptimeMonitor = () => {
  console.log('[Uptime Monitor] Starting background status ping monitor...');
  
  // Run immediately on boot
  pingServices().catch(err => console.error('[Uptime Monitor] Initial boot check failed:', err));

  // Run every 60 seconds (1 minute pings)
  setInterval(async () => {
    try {
      await pingServices();
    } catch (err) {
      console.error('[Uptime Monitor] Interval ping execution failed:', err);
    }
  }, 60000);
};
