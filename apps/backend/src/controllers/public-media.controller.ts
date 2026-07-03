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
    const { getS3ConfigForWorkspace, s3Client: defaultS3Client, BUCKET_NAME: defaultBucketName } = await import('../config/s3');
    const { client, bucketName } = await getS3ConfigForWorkspace(mediaFile.workspaceId);

    let s3Response;
    try {
      s3Response = await client.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: fileKey
      }));
    } catch (s3Err) {
      if (client !== defaultS3Client) {
        try {
          s3Response = await defaultS3Client.send(new GetObjectCommand({
            Bucket: defaultBucketName,
            Key: fileKey
          }));
        } catch (fallbackErr) {
          console.error(`[On-The-Fly] Failed to fetch file ${fileKey} from fallback default S3:`, fallbackErr);
          res.status(404).json({ error: 'Original file not found in storage' });
          return;
        }
      } else {
        console.error(`[On-The-Fly] Failed to fetch file ${fileKey} from S3:`, s3Err);
        res.status(404).json({ error: 'Original file not found in storage' });
        return;
      }
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

    // 1. Обрізка (crop/extract) — cx, cy, cw, ch у пікселях оригінального зображення
    const cxRaw = req.query.cx;
    const cyRaw = req.query.cy;
    const cwRaw = req.query.cw;
    const chRaw = req.query.ch;

    if (cxRaw && cyRaw && cwRaw && chRaw) {
      const meta = await sharpImg.metadata();
      const origW = meta.width || 0;
      const origH = meta.height || 0;

      const cx = Math.max(0, parseInt(cxRaw as string, 10));
      const cy = Math.max(0, parseInt(cyRaw as string, 10));
      const cw = Math.max(1, parseInt(cwRaw as string, 10));
      const ch = Math.max(1, parseInt(chRaw as string, 10));

      // Перевіряємо, що обрізка не виходить за межі зображення
      if (cx + cw <= origW && cy + ch <= origH) {
        sharpImg = sharpImg.extract({ left: cx, top: cy, width: cw, height: ch });
      }
    }

    // 2. Зміна розміру (resize)
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


    // 1.5 Watermarking (Pro & Enterprise only)
    const hasWatermark = req.query.wm === 'true' || req.query.watermark === 'true';
    if (hasWatermark) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: mediaFile.workspaceId },
        select: { plan: true }
      });
      if (workspace && (workspace.plan === 'PRO' || workspace.plan === 'ENTERPRISE')) {
        const wmText = String(req.query.wmText || req.query.watermarkText || 'OptiDrive');
        const opacity = parseFloat(String(req.query.wmOpacity || req.query.watermarkOpacity || '0.3')) || 0.3;
        
        try {
          const metadata = await sharpImg.metadata();
          const imgWidth = metadata.width || 800;
          const imgHeight = metadata.height || 600;

          const svgText = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${imgWidth}" height="${imgHeight}">
              <style>
                .watermark {
                  fill: white;
                  fill-opacity: ${opacity};
                  font-family: sans-serif;
                  font-size: ${Math.max(16, Math.floor(imgWidth / 15))}px;
                  font-weight: bold;
                }
              </style>
              <text x="50%" y="50%" text-anchor="middle" class="watermark" transform="rotate(-30, ${imgWidth/2}, ${imgHeight/2})">${wmText}</text>
            </svg>
          `;

          const resizedBuffer = await sharpImg.toBuffer();
          sharpImg = sharp(resizedBuffer).composite([{
            input: Buffer.from(svgText),
            top: 0,
            left: 0
          }]);
        } catch (wmErr) {
          console.error('[Watermark] Failed to apply watermark:', wmErr);
        }
      }
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
