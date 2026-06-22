import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { s3Client, BUCKET_NAME } from '../config/s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

export const getMediaFiles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const mediaFiles = await prisma.mediaFile.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });

    // Convert BigInt to Number for JSON serialization
    const serializedMediaFiles = mediaFiles.map(file => ({
      ...file,
      originalSize: Number(file.originalSize),
      optimizedSize: Number(file.optimizedSize),
    }));

    res.status(200).json({ data: serializedMediaFiles });
  } catch (error) {
    console.error('getMediaFiles Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteMediaFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    const fileId = req.params.id;

    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const mediaFile = await prisma.mediaFile.findFirst({
      where: { id: fileId, workspaceId },
    });

    if (!mediaFile) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Extract R2 Key from cdnUrl
    // cdnUrl format: https://[account_id].r2.cloudflarestorage.com/[bucket]/[workspaceId]/[filename]
    // Or custom public URL: https://pub-[id].r2.dev/[workspaceId]/[filename]
    // The key is always [workspaceId]/[filename]
    const parts = mediaFile.cdnUrl.split('/');
    const filename = parts.pop();
    const folder = parts.pop();
    const key = `${folder}/${filename}`;

    // Delete from R2
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    try {
      await s3Client.send(deleteCommand);
    } catch (s3Error) {
      console.error('Failed to delete from S3/R2:', s3Error);
      // We continue to delete from DB even if S3 fails, or maybe just log it
    }

    // Delete from DB
    await prisma.mediaFile.delete({
      where: { id: fileId },
    });

    // Reduce storage usage
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        storageUsed: { decrement: mediaFile.optimizedSize }
      }
    });

    res.status(200).json({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error('deleteMediaFile Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateMediaFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    const fileId = req.params.id;
    const { name } = req.body;

    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const updatedFile = await prisma.mediaFile.updateMany({
      where: { id: fileId, workspaceId },
      data: { name },
    });

    if (updatedFile.count === 0) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'File updated' });
  } catch (error) {
    console.error('updateMediaFile Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
