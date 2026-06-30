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

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);

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

    const hasTransform = w || h || q || f || fit;

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
      
      const width = w ? parseInt(w as string, 10) : null;
      const height = h ? parseInt(h as string, 10) : null;

      if ((width && !isNaN(width)) || (height && !isNaN(height))) {
        sharpImg = sharpImg.resize({
          width: width && !isNaN(width) ? width : undefined,
          height: height && !isNaN(height) ? height : undefined,
          fit: (fit as any) || 'cover'
        });
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


