import { Request, Response } from 'express';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '../../config/s3';

export const viewMediaController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, filename } = req.params;
    
    if (!workspaceId || !filename) {
      res.status(400).json({ error: 'Missing parameters' });
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
