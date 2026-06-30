import { Request, Response } from 'express';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '../../config/s3';
import { prisma } from '../../config/prisma';
import { checkAndTriggerQuotaEmails } from '../../services/quota-alert.service';

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


