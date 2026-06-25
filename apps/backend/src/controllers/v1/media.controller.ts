import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '../../config/s3';

export const listMediaController = async (req: Request & { workspaceId?: string; user?: { workspaceId: string } }, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { page = '1', limit = '20', search = '', format = 'all' } = req.query;
    
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const whereClause: any = { workspaceId };
    
    if (search) {
      whereClause.name = { contains: search as string, mode: 'insensitive' };
    }
    
    if (format && format !== 'all') {
      whereClause.format = { equals: format as string, mode: 'insensitive' };
    }

    // Execute query
    const [files, total] = await Promise.all([
      prisma.mediaFile.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.mediaFile.count({ where: whereClause })
    ]);

    // Format response (convert BigInt to string for JSON serialization)
    const formattedFiles = files.map(file => ({
      ...file,
      originalSize: file.originalSize.toString(),
      optimizedSize: file.optimizedSize.toString(),
    }));

    res.status(200).json({
      success: true,
      data: formattedFiles,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error: any) {
    console.error('listMediaController Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteMediaController = async (req: Request & { workspaceId?: string; user?: { workspaceId: string } }, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    const { id } = req.params;

    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // 1. Fetch file from DB
    const file = await prisma.mediaFile.findUnique({
      where: { id: id as string }
    });

    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    if (file.workspaceId !== workspaceId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // 2. Delete from R2 (S3)
    const key = `${workspaceId}/${file.cdnUrl.split('/').pop()}`; // Extract filename from CDN URL
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    try {
      await s3Client.send(command);
    } catch (s3Error) {
      console.error(`Failed to delete from R2: ${key}`, s3Error);
      // We continue to delete from DB even if R2 fails (to avoid orphan records if R2 already deleted)
    }

    // 3. Update Workspace Storage
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        storageUsed: { decrement: file.optimizedSize }
      }
    });

    // 4. Create Activity Log
    await prisma.activityLog.create({
      data: {
        type: 'FILE_DELETED',
        description: `Deleted API file ${file.name}`,
        workspaceId,
        userId: null,
      }
    });

    await prisma.mediaFile.delete({
      where: { id: id as string }
    });

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error: any) {
    console.error('deleteMediaController Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
