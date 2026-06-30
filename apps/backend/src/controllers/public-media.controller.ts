import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '../config/s3';
import sharp from 'sharp';

export const viewMediaFileOnTheFly = async (req: Request, res: Response): Promise<void> => {
  try {
    const fileId = req.params.id as string;

    const mediaFile = await prisma.mediaFile.findFirst({
      where: { id: fileId, isDeleted: false }
    });

    if (!mediaFile) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Якщо запит прийшов через кастомний домен, перевіряємо, чи файл належить цьому ж воркспейсу
    const customDomain = (req as any).customDomain;
    if (customDomain && mediaFile.workspaceId !== customDomain.workspaceId) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Визначаємо S3 ключ
    const urlParts = mediaFile.cdnUrl.split('/');
    const fileKey = `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}`;

    // Завантажуємо файл з S3/R2
    let s3Response;
    try {
      s3Response = await s3Client.send(new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey
      }));
    } catch (s3Err) {
      console.error(`[On-The-Fly] Failed to fetch file ${fileKey} from S3:`, s3Err);
      res.status(404).json({ error: 'Original file not found in storage' });
      return;
    }

    const bodyStream = s3Response.Body;
    if (!bodyStream) {
      res.status(500).json({ error: 'Failed to retrieve file contents' });
      return;
    }

    // Зчитуємо потік у буфер
    const chunks: any[] = [];
    for await (const chunk of bodyStream as any) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Визначаємо MIME тип на основі формату
    const formatClean = mediaFile.format.toLowerCase();
    let detectedMimeType = 'application/octet-stream';
    if (formatClean === 'jpg' || formatClean === 'jpeg') detectedMimeType = 'image/jpeg';
    else if (formatClean === 'png') detectedMimeType = 'image/png';
    else if (formatClean === 'webp') detectedMimeType = 'image/webp';
    else if (formatClean === 'avif') detectedMimeType = 'image/avif';
    else if (formatClean === 'gif') detectedMimeType = 'image/gif';
    else if (formatClean === 'pdf') detectedMimeType = 'application/pdf';

    const isImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(detectedMimeType);

    if (!isImage) {
      // Якщо це не зображення (наприклад, pdf або відео) — віддаємо як є
      res.setHeader('Content-Type', detectedMimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.send(buffer);
      return;
    }

    // Обробка зображення через Sharp
    let sharpImg = sharp(buffer);

    // 1. Зміна розміру (resize)
    const w = req.query.w || req.query.width;
    const h = req.query.h || req.query.height;
    const fit = (req.query.fit as string) || 'cover';

    const width = w ? parseInt(w as string, 10) : null;
    const height = h ? parseInt(h as string, 10) : null;

    if ((width && !isNaN(width)) || (height && !isNaN(height))) {
      sharpImg = sharpImg.resize({
        width: width && !isNaN(width) ? width : undefined,
        height: height && !isNaN(height) ? height : undefined,
        fit: fit as any
      });
    }

    // 2. Формат та якість
    const f = req.query.f || req.query.format;
    const format = f ? (f as string).toLowerCase() : 'webp';
    
    const q = req.query.q || req.query.quality;
    const quality = q ? parseInt(q as string, 10) : 80;

    let mimeType = 'image/webp';
    if (format === 'jpeg' || format === 'jpg') {
      sharpImg = sharpImg.jpeg({ quality });
      mimeType = 'image/jpeg';
    } else if (format === 'png') {
      sharpImg = sharpImg.png({ compressionLevel: 9 });
      mimeType = 'image/png';
    } else if (format === 'avif') {
      sharpImg = sharpImg.avif({ quality });
      mimeType = 'image/avif';
    } else if (format === 'gif') {
      // Sharp підтримує gif через libvips, але для простоти переводимо у webp/gif
      sharpImg = sharpImg.gif();
      mimeType = 'image/gif';
    } else {
      // за замовчуванням webp
      sharpImg = sharpImg.webp({ quality });
      mimeType = 'image/webp';
    }

    const outputBuffer = await sharpImg.toBuffer();

    // 3. Логування використання трафіку
    prisma.workspace.update({
      where: { id: mediaFile.workspaceId },
      data: {
        bandwidthUsed: { increment: BigInt(outputBuffer.length) }
      }
    }).catch((err) => console.error('[Bandwidth] Failed to log dynamic optimization bandwidth:', err));

    // 4. Відправка відповіді з заголовками кешування
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(outputBuffer);
  } catch (error) {
    console.error('viewMediaFileOnTheFly Error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
};
