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

    // Перевіряємо чи воркспейс заморожено
    const { isWorkspaceLocked } = await import('../utils/workspace-status');
    const locked = await isWorkspaceLocked(mediaFile.workspaceId);
    if (locked) {
      res.status(402).json({ error: 'Payment Required: Workspace is locked.' });
      return;
    }

    const { getWorkspacePlanLimits } = await import('../utils/workspace-status');
    const { limits: planLimits, plan: workspacePlan, isPaid } = await getWorkspacePlanLimits(mediaFile.workspaceId);

    // Check Bandwidth limit
    const workspaceData = await prisma.workspace.findUnique({
      where: { id: mediaFile.workspaceId },
      select: { bandwidthUsed: true, customS3Enabled: true }
    });
    if (workspaceData && workspaceData.bandwidthUsed >= BigInt(planLimits.bandwidthBytes)) {
      res.status(402).json({ error: 'Payment Required: Bandwidth limit reached for this workspace.' });
      return;
    }

    // Check custom domain permission (not allowed on FREE)
    if (customDomain && workspacePlan === 'FREE') {
      res.status(402).json({ error: 'Payment Required: Custom domains are not supported on your current plan.' });
      return;
    }

    // Check custom S3 suspension
    if (workspaceData?.customS3Enabled && !isPaid) {
      res.status(402).json({ error: 'Payment Required: Custom S3 Storage access is suspended due to unpaid subscription.' });
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
    else if (formatClean === 'svg') detectedMimeType = 'image/svg+xml';
    else if (formatClean === 'pdf') detectedMimeType = 'application/pdf';

    const isImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(detectedMimeType);

    if (!isImage) {
      // Якщо це не зображення (наприклад, pdf, svg або відео) — віддаємо як є
      res.setHeader('Content-Type', detectedMimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.send(buffer);
      return;
    }

    // Визначаємо вихідний формат для перевірки, чи він статичний
    const f = req.query.f || req.query.format;
    const format = f ? (f as string).toLowerCase() : 'webp';
    const isStaticFormat = ['png', 'jpeg', 'jpg'].includes(format);

    // Обробка зображення через Sharp (з підтримкою анімацій)
    const preMeta = await sharp(buffer).metadata();
    const isAnimated = !!(preMeta.pages && preMeta.pages > 1 && !isStaticFormat);
    let sharpImg = sharp(buffer, isAnimated ? { animated: true } : undefined);

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
      if (workspacePlan === 'PRO' || workspacePlan === 'ENTERPRISE') {
        const opacity = parseFloat(String(req.query.wmOpacity || req.query.watermarkOpacity || '0.3')) || 0.3;

        // Get actual current dimensions of the image (after crop/resizes)
        const currentBuffer = await sharpImg.toBuffer();
        const currentMeta = await sharp(currentBuffer).metadata();
        const imgWidth = currentMeta.width || 800;
        const imgHeight = currentMeta.height || 600;
        const currentIsAnimated = !!(currentMeta.pages && currentMeta.pages > 1);
        sharpImg = sharp(currentBuffer, currentIsAnimated ? { animated: true } : undefined);

        // Fetch workspace default watermark settings
        const workspace = await prisma.workspace.findUnique({
          where: { id: mediaFile.workspaceId },
          select: { defaultWatermarkText: true, defaultWatermarkUrl: true }
        });

        const wmImage = req.query.wmImage ? String(req.query.wmImage) : workspace?.defaultWatermarkUrl;
        const wmType = req.query.wmType ? String(req.query.wmType) : (wmImage ? 'image' : 'text');

        // Watermark transform parameters
        const wmX = parseFloat(String(req.query.wmX || req.query.watermarkX || (wmType === 'image' ? '85' : '50')));
        const wmY = parseFloat(String(req.query.wmY || req.query.watermarkY || (wmType === 'image' ? '85' : '50')));
        const wmSize = parseFloat(String(req.query.wmSize || req.query.watermarkSize || (wmType === 'image' ? '25' : '15')));
        const wmRotation = parseFloat(String(req.query.wmRotation || req.query.watermarkRotation || (wmType === 'image' ? '0' : '-30')));

        // Зображення-водяний знак доступне тільки на тарифі ENTERPRISE
        if (wmType === 'image' && wmImage && workspacePlan === 'ENTERPRISE') {
          try {
            const axios = (await import('axios')).default;
            const wmResponse = await axios.get(wmImage, { responseType: 'arraybuffer' });
            const wmBuffer = Buffer.from(wmResponse.data);

            const wmW = Math.max(10, Math.floor(imgWidth * (wmSize / 100)));

            let processedWm = sharp(wmBuffer).resize(wmW);

            if (wmRotation !== 0) {
              processedWm = processedWm.rotate(wmRotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
            }

            // Напівпрозорість водяного знака
            const resizedWmBuffer = await processedWm
              .composite([{
                input: Buffer.from([255, 255, 255, Math.floor(opacity * 255)]),
                raw: { width: 1, height: 1, channels: 4 },
                tile: true,
                blend: 'dest-in'
              }])
              .toBuffer();

            const wmMeta = await sharp(resizedWmBuffer).metadata();
            const wmMetaW = wmMeta.width || wmW;
            const wmMetaH = wmMeta.height || wmW;

            const left = Math.round((wmX / 100) * imgWidth - wmMetaW / 2);
            const top = Math.round((wmY / 100) * imgHeight - wmMetaH / 2);

            const resizedBuffer = await sharpImg.toBuffer();
            const resizedMeta = await sharp(resizedBuffer).metadata();
            const resizedIsAnimated = !!(resizedMeta.pages && resizedMeta.pages > 1);
            const numPages = resizedIsAnimated ? resizedMeta.pages || 1 : 1;

            const compositeInputs = [];
            for (let i = 0; i < numPages; i++) {
              compositeInputs.push({
                input: resizedWmBuffer,
                left: Math.max(0, left),
                top: Math.max(0, top + i * imgHeight),
              });
            }

            sharpImg = sharp(resizedBuffer, resizedIsAnimated ? { animated: true } : undefined).composite(compositeInputs);
          } catch (imgWmErr) {
            console.error('[Watermark] Failed to apply image watermark, falling back to text:', imgWmErr);
            const textVal = String(req.query.wmText || req.query.watermarkText || workspace?.defaultWatermarkText || 'OptiDrive');
            await applyTextWatermark(opacity, textVal, wmX, wmY, wmSize, wmRotation, imgWidth, imgHeight);
          }
        } else {
          // Текстовий водяний знак (PRO та fallback для Enterprise)
          const textVal = String(req.query.wmText || req.query.watermarkText || workspace?.defaultWatermarkText || 'OptiDrive');
          await applyTextWatermark(opacity, textVal, wmX, wmY, wmSize, wmRotation, imgWidth, imgHeight);
        }
      }
    }

    async function applyTextWatermark(opacity: number, text: string, xPct: number, yPct: number, sizePct: number, rotation: number, width: number, height: number) {
      const escapeXml = (unsafe: string): string => {
        return unsafe.replace(/[<>&'"]/g, (c) => {
          switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
          }
        });
      };

      const wmText = escapeXml(text);
      
      try {
        const textX = (xPct / 100) * width;
        const textY = (yPct / 100) * height;
        const fontSize = Math.max(12, Math.floor(width * (sizePct / 100) * 0.4));

        const resizedBuffer = await sharpImg.toBuffer();
        const resizedMeta = await sharp(resizedBuffer).metadata();
        const resizedIsAnimated = !!(resizedMeta.pages && resizedMeta.pages > 1);
        const numPages = resizedIsAnimated ? resizedMeta.pages || 1 : 1;

        const totalHeight = resizedIsAnimated ? height * numPages : height;
        let svgContent = '';
        for (let i = 0; i < numPages; i++) {
          const textYWithOffset = textY + i * height;
          svgContent += `<text x="${textX}" y="${textYWithOffset}" font-family="sans-serif" font-size="${fontSize}" font-weight="bold" fill="#ffffff" fill-opacity="${opacity}" text-anchor="middle" transform="rotate(${rotation}, ${textX}, ${textYWithOffset})">${wmText}</text>`;
        }

        const svgText = `
          <svg width="${width}" height="${totalHeight}">
            ${svgContent}
          </svg>
        `;

        sharpImg = sharp(resizedBuffer, resizedIsAnimated ? { animated: true } : undefined).composite([{
          input: Buffer.from(svgText),
          top: 0,
          left: 0
        }]);
      } catch (wmErr) {
        console.error('[Watermark] Failed to apply text watermark:', wmErr);
      }
    }

    // 2. Формат та якість
    
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

    // 4. Затримка для безкоштовного тарифу (імітація нижчого пріоритету черги)
    if (workspacePlan === 'FREE') {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // 5. Відправка відповіді з заголовками кешування та пріоритету CDN
    const priority = workspacePlan === 'PRO' || workspacePlan === 'ENTERPRISE' ? 'HIGH' : 'STANDARD';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-CDN-Priority', priority);
    res.setHeader('X-CDN-Edge-Speed', priority === 'HIGH' ? '10Gbps' : '1Gbps');
    res.send(outputBuffer);
  } catch (error) {
    console.error('viewMediaFileOnTheFly Error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
};
