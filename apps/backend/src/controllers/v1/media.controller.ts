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

    const { page = '1', limit = '20', search = '', format = 'all', tag = '' } = req.query;
    
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const whereClause: any = { workspaceId, isDeleted: false };
    
    if (search) {
      whereClause.name = { contains: search as string, mode: 'insensitive' };
    }
    
    if (format && format !== 'all') {
      whereClause.format = { equals: format as string, mode: 'insensitive' };
    }

    if (tag && typeof tag === 'string') {
      whereClause.tags = {
        some: {
          name: { equals: tag, mode: 'insensitive' }
        }
      };
    }

    // Execute query
    const [files, total] = await Promise.all([
      prisma.mediaFile.findMany({
        where: whereClause,
        include: {
          tags: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.mediaFile.count({ where: whereClause })
    ]);

    // Format response (convert BigInt to string for JSON serialization)
    const formattedFiles = files.map((file: any) => ({
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
    const file = await prisma.mediaFile.findFirst({
      where: { id: id as string, workspaceId, isDeleted: false }
    });

    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // 2. Soft delete
    await prisma.mediaFile.update({
      where: { id: id as string },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    // 3. Create Activity Log
    await prisma.activityLog.create({
      data: {
        type: 'FILE_DELETED',
        description: `Moved file ${file.name} to Trash via API`,
        workspaceId,
        userId: null,
      }
    });

    res.status(200).json({
      success: true,
      message: 'File moved to Trash'
    });

  } catch (error: any) {
    console.error('deleteMediaController Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
