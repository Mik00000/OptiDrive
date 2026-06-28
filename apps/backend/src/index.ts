import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import internalRoutes from './routes/internal';
import v1Routes from './routes/v1';
import { prisma } from './config/prisma';
import { s3Client, BUCKET_NAME } from './config/s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

const app = express();
app.use(cors()); // Дозволяємо CORS запити
app.use(express.json()); // Щоб Express розумів JSON з req.body

// Внутрішнє API для взаємодії з дашбордом
app.use('/api/internal', internalRoutes);

// Зовнішнє API для використання користувачами (через API-ключі)
app.use('/api/v1', v1Routes);

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
      for (const file of filesToPurge) {
        const parts = file.cdnUrl.split('/');
        const filename = parts.pop();
        const folderName = parts.pop();
        const key = `${folderName}/${filename}`;

        const deleteCommand = new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key
        });

        try {
          await s3Client.send(deleteCommand);
        } catch (s3Error) {
          console.error(`[Auto-Purge] Failed to delete file ${file.id} from S3/R2:`, s3Error);
        }
      }

      const fileIds = filesToPurge.map(f => f.id);
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
          id: { in: foldersToPurge.map(f => f.id) }
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

app.listen(3001, () => {
  console.log('Server is running on port 3001');
  keepNeonAwake(); // Запускаємо пінгування після старту сервера
  startRecycleBinAutoPurge(); // Запускаємо очищення кошика
});
