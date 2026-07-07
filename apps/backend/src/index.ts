import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import internalRoutes from './routes/internal';
import v1Routes from './routes/v1';
import { prisma } from './config/prisma';
import { s3Client, BUCKET_NAME } from './config/s3';
import { DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { detectCustomDomain } from './middlewares/domain.middleware';

import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Nginx, Cloudflare, AWS ALB, etc.)

// Secure headers with Helmet (allow cross-origin media sharing)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Enable Gzip/Brotli response compression for faster response delivery
app.use(compression());

// Parse cookies from incoming requests
app.use(cookieParser());

app.use(cors({
  origin: process.env.FRONTEND_URL as string,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));

// Stripe Webhook — ОБОВ'ЯЗКОВО ДО express.json()!
// Webhook потребує raw body для перевірки підпису
import { handleStripeWebhook } from './controllers/stripe-webhook.controller';
app.post('/api/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json()); // Щоб Express розумів JSON з req.body
app.use(detectCustomDomain);

// Внутрішнє API для взаємодії з дашбордом
app.use('/api/internal', internalRoutes);

// Зовнішнє API для використання користувачами (через API-ключі)
app.use('/api/v1', v1Routes);

// Публічні лінки для розшарювання
import publicShareRoutes from './routes/public/share.routes';
import { viewMediaFileOnTheFly } from './controllers/public-media.controller';

app.use('/api/public/share', publicShareRoutes);
app.get('/api/public/media/view/:id', viewMediaFileOnTheFly);
app.get('/view/:id', viewMediaFileOnTheFly); // Для використання з кастомними доменами

// Функція-костиль (keep-alive) для NeonDB, щоб він не засинав
const keepNeonAwake = () => {
  // Робимо простий запит кожні 2 хвилини
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('Keep-alive ping sent to NeonDB');
    } catch (err) {
      console.error('NeonDB keep-alive failed:', err);
    }
  }, 2 * 60 * 1000); // 2 хвилини (Neon засинає через 5)
};

// Фонова задача для автоматичного очищення кошика від старіших за 30 днів об'єктів
const runTrashAutoPurge = async () => {
  try {
    const purgeThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 днів тому
    console.log(`[Auto-Purge] Running trash auto-purge for items deleted before ${purgeThreshold.toISOString()}`);

    // 1. Очищення видалених файлів
    const filesToPurge = await prisma.mediaFile.findMany({
      where: {
        isDeleted: true,
        deletedAt: { lte: purgeThreshold }
      }
    });

    if (filesToPurge.length > 0) {
      console.log(`[Auto-Purge] Found ${filesToPurge.length} files to delete permanently`);
      const chunkSize = 1000;
      for (let i = 0; i < filesToPurge.length; i += chunkSize) {
        const chunk = filesToPurge.slice(i, i + chunkSize);
        const objects = chunk.map(file => {
          const parts = file.cdnUrl.split('/');
          const filename = parts.pop();
          const folderName = parts.pop();
          return { Key: `${folderName}/${filename}` };
        });

        try {
          await s3Client.send(new DeleteObjectsCommand({
            Bucket: BUCKET_NAME,
            Delete: { Objects: objects, Quiet: true }
          }));
        } catch (s3Error) {
          console.error('[Auto-Purge] Failed to delete files chunk from S3/R2:', s3Error);
        }
      }

      const fileIds = filesToPurge.map((f: any) => f.id);
      await prisma.mediaFile.deleteMany({
        where: { id: { in: fileIds } }
      });

      // Зменшуємо використану квоту сховища для відповідних воркспейсів
      const workspaceStorageFreed = new Map<string, bigint>();
      for (const file of filesToPurge) {
        const current = workspaceStorageFreed.get(file.workspaceId) || BigInt(0);
        workspaceStorageFreed.set(file.workspaceId, current + file.optimizedSize);
      }

      for (const [workspaceId, storageFreed] of workspaceStorageFreed.entries()) {
        await prisma.workspace.update({
          where: { id: workspaceId },
          data: {
            storageUsed: { decrement: storageFreed }
          }
        });
      }
    }

    // 2. Очищення видалених папок
    const foldersToPurge = await prisma.folder.findMany({
      where: {
        isDeleted: true,
        deletedAt: { lte: purgeThreshold }
      }
    });

    if (foldersToPurge.length > 0) {
      console.log(`[Auto-Purge] Found ${foldersToPurge.length} folders to delete permanently`);
      await prisma.folder.deleteMany({
        where: {
          id: { in: foldersToPurge.map((f: any) => f.id) }
        }
      });
    }

    // 3. Очищення невикористаних тегів
    await prisma.tag.deleteMany({
      where: {
        files: { none: {} }
      }
    });

    console.log('[Auto-Purge] Trash auto-purge finished');
  } catch (err) {
    console.error('[Auto-Purge] Trash auto-purge failed:', err);
  }
};

const startRecycleBinAutoPurge = () => {
  // Запуск один раз при старті через 5 секунд
  setTimeout(runTrashAutoPurge, 5000);

  // Повторний запуск кожні 24 години
  setInterval(runTrashAutoPurge, 24 * 60 * 60 * 1000);
};

// Фонова задача для очищення непідтверджених користувачів, протермінованих посилань та старих логів
const runSystemCleanup = async () => {
  try {
    console.log('[System-Cleanup] Running periodic cleanup tasks...');

    // 1. Очистка непідтверджених користувачів, створених більше 24 годин тому
    const userThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const unverifiedUsers = await prisma.user.findMany({
      where: {
        emailVerified: false,
        createdAt: { lte: userThreshold }
      },
      include: {
        workspaces: true
      }
    });

    if (unverifiedUsers.length > 0) {
      console.log(`[System-Cleanup] Found ${unverifiedUsers.length} unverified users to delete`);
      const workspaceIdsToCheck = unverifiedUsers.flatMap((u: any) => u.workspaces.map((w: any) => w.workspaceId));
      
      const userIds = unverifiedUsers.map((u: any) => u.id);
      await prisma.user.deleteMany({
        where: { id: { in: userIds } }
      });

      // Перевіряємо чи є воркспейси без учасників і видаляємо їх
      if (workspaceIdsToCheck.length > 0) {
        const orphanedWorkspaces = await prisma.workspace.findMany({
          where: {
            id: { in: workspaceIdsToCheck },
            members: { none: {} }
          }
        });

        if (orphanedWorkspaces.length > 0) {
          console.log(`[System-Cleanup] Deleting ${orphanedWorkspaces.length} orphaned workspaces`);
          await prisma.workspace.deleteMany({
            where: { id: { in: orphanedWorkspaces.map((w: any) => w.id) } }
          });
        }
      }
    }

    // 2. Видалення протермінованих посилань (ShareLink)
    const expiredLinks = await prisma.shareLink.deleteMany({
      where: {
        expiresAt: { lte: new Date() }
      }
    });
    if (expiredLinks.count > 0) {
      console.log(`[System-Cleanup] Purged ${expiredLinks.count} expired share links`);
    }

    // 3. Очистка старих логів (активності та аналітики) старше 90 днів
    const logsThreshold = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const activityPurged = await prisma.activityLog.deleteMany({
      where: { createdAt: { lte: logsThreshold } }
    });
    
    const analyticsPurged = await prisma.analyticsLog.deleteMany({
      where: { timestamp: { lte: logsThreshold } }
    });

    if (activityPurged.count > 0 || analyticsPurged.count > 0) {
      console.log(`[System-Cleanup] Purged ${activityPurged.count} activity logs and ${analyticsPurged.count} analytics logs`);
    }

    // 4. Очистка протермінованих запрошень (Invitation)
    const expiredInvitations = await prisma.invitation.deleteMany({
      where: {
        expiresAt: { lte: new Date() }
      }
    });
    
    if (expiredInvitations.count > 0) {
      console.log(`[System-Cleanup] Purged ${expiredInvitations.count} expired invitations`);
    }

    console.log('[System-Cleanup] Cleanup finished');
  } catch (err) {
    console.error('[System-Cleanup] Cleanup failed:', err);
  }
};

const startSystemCleanup = () => {
  // Запуск один раз при старті через 10 секунд
  setTimeout(runSystemCleanup, 10000);

  // Повторний запуск кожні 24 години
  setInterval(runSystemCleanup, 24 * 60 * 60 * 1000);
};

app.listen(3001, () => {
  console.log('Server is running on port 3001');
  keepNeonAwake(); // Запускаємо пінгування після старту сервера
  startRecycleBinAutoPurge(); // Запускаємо очищення кошика
  startSystemCleanup(); // Запускаємо очищення системи
});
