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

      let sharpImg = sharp(buffer);

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
            console.error('[Watermark V1] Failed to apply watermark:', wmErr);
          }
        }
      }

      const format = f ? (f as string).toLowerCase() : 'webp';
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


