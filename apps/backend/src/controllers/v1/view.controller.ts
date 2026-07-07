import { Request, Response } from 'express';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '../../config/s3';
import { prisma } from '../../config/prisma';
import { checkAndTriggerQuotaEmails } from '../../services/quota-alert.service';
import sharp from 'sharp';

export const viewMediaController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, filename } = req.params;
    
    if (!workspaceId || !filename) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }

    if (typeof workspaceId !== 'string' || typeof filename !== 'string') {
      res.status(400).json({ error: 'Invalid parameters' });
      return;
    }

    // Prevent path traversal and cross-workspace access
    if (
      workspaceId.includes('/') || workspaceId.includes('\\') || workspaceId.includes('..') ||
      filename.includes('/') || filename.includes('\\') || filename.includes('..')
    ) {
      res.status(400).json({ error: 'Access denied: Invalid parameters' });
      return;
    }

    // Check if the file exists in the database and is not soft-deleted
    const mediaFile = await prisma.mediaFile.findFirst({
      where: {
        workspaceId,
        cdnUrl: {
          endsWith: `/${filename}`
        }
      }
    });

    if (!mediaFile || mediaFile.isDeleted) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    const key = `${workspaceId}/${filename}`;

    const { getS3ConfigForWorkspace, s3Client: defaultS3Client, BUCKET_NAME: defaultBucketName } = await import('../../config/s3');
    const { client, bucketName } = await getS3ConfigForWorkspace(workspaceId);

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    let response;
    try {
      response = await client.send(command);
    } catch (s3Err) {
      if (client !== defaultS3Client) {
        try {
          response = await defaultS3Client.send(new GetObjectCommand({
            Bucket: defaultBucketName,
            Key: key
          }));
        } catch (fallbackErr) {
          if (fallbackErr instanceof Error && fallbackErr.name === 'NoSuchKey') {
            res.status(404).json({ error: 'Image not found' });
            return;
          }
          throw fallbackErr;
        }
      } else {
        if (s3Err instanceof Error && s3Err.name === 'NoSuchKey') {
          res.status(404).json({ error: 'Image not found' });
          return;
        }
        throw s3Err;
      }
    }

    if (!response.Body) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    // Increment bandwidthUsed in workspace
    prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        bandwidthUsed: { increment: mediaFile.optimizedSize }
      }
    })
      .then(() => {
        checkAndTriggerQuotaEmails(workspaceId).catch((err) => 
          console.error('[Quota Warning] Failed to check quota:', err)
        );
      })
      .catch((err: any) => console.error('[Bandwidth] Failed to update bandwidthUsed:', err));

    const w = req.query.w || req.query.width;
    const h = req.query.h || req.query.height;
    const q = req.query.q || req.query.quality;
    const f = req.query.f || req.query.format;
    const fit = req.query.fit;
    const wm = req.query.wm || req.query.watermark;
    const cx = req.query.cx;
    const cy = req.query.cy;
    const cw = req.query.cw;
    const ch = req.query.ch;

    const hasTransform = w || h || q || f || fit || wm || (cx && cy && cw && ch);

    const isImage = (response.ContentType && response.ContentType.startsWith('image/')) ||
                    ['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(mediaFile.format.toLowerCase());

    if (hasTransform && isImage) {
      // Перетворимо потік у буфер та обробимо через Sharp
      const chunks = [];
      const stream = response.Body as import('stream').Readable;
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      const format = f ? (f as string).toLowerCase() : 'webp';
      const isStaticFormat = ['png', 'jpeg', 'jpg'].includes(format);

      const preMeta = await sharp(buffer).metadata();
      const isAnimated = !!(preMeta.pages && preMeta.pages > 1 && !isStaticFormat);
      let sharpImg = sharp(buffer, isAnimated ? { animated: true } : undefined);

      // Crop (extract) — cx, cy, cw, ch у пікселях оригіналу
      if (cx && cy && cw && ch) {
        const meta = await sharpImg.metadata();
        const origW = meta.width || 0;
        const origH = meta.height || 0;
        const cxN = Math.max(0, parseInt(cx as string, 10));
        const cyN = Math.max(0, parseInt(cy as string, 10));
        const cwN = Math.max(1, parseInt(cw as string, 10));
        const chN = Math.max(1, parseInt(ch as string, 10));
        if (cxN + cwN <= origW && cyN + chN <= origH) {
          sharpImg = sharpImg.extract({ left: cxN, top: cyN, width: cwN, height: chN });
        }
      }
      
      const width = w ? parseInt(w as string, 10) : null;
      const height = h ? parseInt(h as string, 10) : null;

      if ((width && !isNaN(width)) || (height && !isNaN(height))) {
        sharpImg = sharpImg.resize({
          width: width && !isNaN(width) ? width : undefined,
          height: height && !isNaN(height) ? height : undefined,
          fit: (fit as any) || 'cover'
        });
      }

      // 1.5 Watermarking (Pro & Enterprise only)
      const hasWatermark = wm === 'true';
      if (hasWatermark) {
        const workspace = await prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { plan: true, defaultWatermarkText: true, defaultWatermarkUrl: true }
        });
        const workspacePlan = workspace?.plan || 'FREE';
        if (workspace && (workspacePlan === 'PRO' || workspacePlan === 'ENTERPRISE')) {
          const opacity = parseFloat(String(req.query.wmOpacity || req.query.watermarkOpacity || '0.3')) || 0.3;

          // Get actual current dimensions of the image (after crop/resizes)
          const currentBuffer = await sharpImg.toBuffer();
          const currentMeta = await sharp(currentBuffer).metadata();
          const imgWidth = currentMeta.width || 800;
          const imgHeight = currentMeta.height || 600;
          const currentIsAnimated = !!(currentMeta.pages && currentMeta.pages > 1);
          sharpImg = sharp(currentBuffer, currentIsAnimated ? { animated: true } : undefined);

          const wmImage = req.query.wmImage ? String(req.query.wmImage) : workspace?.defaultWatermarkUrl;
          const wmType = req.query.wmType ? String(req.query.wmType) : (wmImage ? 'image' : 'text');

          // Watermark transform parameters
          const wmX = parseFloat(String(req.query.wmX || req.query.watermarkX || (wmType === 'image' ? '85' : '50')));
          const wmY = parseFloat(String(req.query.wmY || req.query.watermarkY || (wmType === 'image' ? '85' : '50')));
          const wmSize = parseFloat(String(req.query.wmSize || req.query.watermarkSize || (wmType === 'image' ? '25' : '15')));
          const wmRotation = parseFloat(String(req.query.wmRotation || req.query.watermarkRotation || (wmType === 'image' ? '0' : '-30')));

          // Image Watermark (Enterprise only)
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

              // Apply opacity
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
            // Text Watermark
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

      const quality = q ? parseInt(q as string, 10) : 80;

      let mimeType = response.ContentType || 'image/webp';
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
        sharpImg = sharpImg.gif();
        mimeType = 'image/gif';
      } else {
        sharpImg = sharpImg.webp({ quality });
        mimeType = 'image/webp';
      }

      const outputBuffer = await sharpImg.toBuffer();

      // Оновлюємо bandwidthUsed згідно з фактичним розміром оптимізованого виходу
      prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          bandwidthUsed: { increment: BigInt(outputBuffer.length) }
        }
      }).catch((err: any) => console.error('[Bandwidth] Failed to update bandwidthUsed for on-the-fly request:', err));

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.send(outputBuffer);
    } else {
      // Звичайний стримінг без трансформації
      if (response.ContentType) {
        res.setHeader('Content-Type', response.ContentType);
      }
      if (response.CacheControl) {
        res.setHeader('Cache-Control', response.CacheControl);
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      }
      const stream = response.Body as import('stream').Readable;
      stream.pipe(res);
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'NoSuchKey') {
      res.status(404).json({ error: 'Image not found' });
      return;
    }
    console.error('viewMediaController Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const viewAvatarController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    if (!filename) {
      res.status(400).json({ error: 'Missing filename' });
      return;
    }

    // Prevent directory traversal
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      res.status(400).json({ error: 'Access denied: Invalid filename' });
      return;
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `avatars/${filename}`
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      res.status(404).json({ error: 'Avatar not found' });
      return;
    }

    if (response.ContentType) {
      res.setHeader('Content-Type', response.ContentType);
    }
    if (response.CacheControl) {
      res.setHeader('Cache-Control', response.CacheControl);
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }

    // Stream the body to the response
    const stream = response.Body as import('stream').Readable;
    stream.pipe(res);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'NoSuchKey') {
      res.status(404).json({ error: 'Avatar not found' });
      return;
    }
    console.error('viewAvatarController Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const viewWatermarkController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    if (!filename) {
      res.status(400).json({ error: 'Missing filename' });
      return;
    }

    const fnStr = String(filename);

    // Prevent directory traversal
    if (fnStr.includes('/') || fnStr.includes('\\') || fnStr.includes('..')) {
      res.status(400).json({ error: 'Access denied: Invalid filename' });
      return;
    }

    const parts = fnStr.split('-');
    const workspaceId = parts[0] || '';

    const { getS3ConfigForWorkspace, s3Client: defaultS3Client, BUCKET_NAME: defaultBucketName } = await import('../../config/s3');
    const { client, bucketName } = await getS3ConfigForWorkspace(workspaceId);

    const key = `watermarks/${fnStr}`;

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    });

    let response;
    try {
      response = await client.send(command);
    } catch (s3Err) {
      if (client !== defaultS3Client) {
        try {
          response = await defaultS3Client.send(new GetObjectCommand({
            Bucket: defaultBucketName,
            Key: key
          }));
        } catch (fallbackErr) {
          if (fallbackErr instanceof Error && fallbackErr.name === 'NoSuchKey') {
            res.status(404).json({ error: 'Watermark not found' });
            return;
          }
          throw fallbackErr;
        }
      } else {
        if (s3Err instanceof Error && s3Err.name === 'NoSuchKey') {
          res.status(404).json({ error: 'Watermark not found' });
          return;
        }
        throw s3Err;
      }
    }

    if (!response.Body) {
      res.status(404).json({ error: 'Watermark not found' });
      return;
    }

    if (response.ContentType) {
      res.setHeader('Content-Type', response.ContentType);
    }
    if (response.CacheControl) {
      res.setHeader('Cache-Control', response.CacheControl);
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }

    const stream = response.Body as import('stream').Readable;
    stream.pipe(res);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'NoSuchKey') {
      res.status(404).json({ error: 'Watermark not found' });
      return;
    }
    console.error('viewWatermarkController Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



