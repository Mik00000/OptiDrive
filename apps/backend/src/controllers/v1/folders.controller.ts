import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { s3Client, BUCKET_NAME } from '../../config/s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

// Recursively get all children folder IDs
async function getAllSubfolderIds(folderId: string): Promise<string[]> {
  const subfolders = await prisma.folder.findMany({
    where: { parentId: folderId },
    select: { id: true },
  });

  let ids = subfolders.map(sf => sf.id);
  for (const id of ids) {
    const subIds = await getAllSubfolderIds(id);
    ids = ids.concat(subIds);
  }
  return ids;
}

export const listFoldersController = async (req: Request & { workspaceId?: string; user?: { workspaceId: string } }, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized: No workspace context' });
      return;
    }

    const all = req.query.all === 'true';
    if (all) {
      const folders = await prisma.folder.findMany({
        where: { workspaceId },
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { files: true, children: true }
          }
        }
      });
      res.status(200).json({ success: true, data: folders });
      return;
    }

    const parentId = req.query.parentId === 'null' || !req.query.parentId ? null : String(req.query.parentId);

    const folders = await prisma.folder.findMany({
      where: {
        workspaceId,
        parentId
      },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { files: true, children: true }
        }
      }
    });

    res.status(200).json({ success: true, data: folders });
  } catch (error) {
    console.error('listFoldersController Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createFolderController = async (req: Request & { workspaceId?: string; user?: { workspaceId: string } }, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized: No workspace context' });
      return;
    }

    const { name, parentId, color } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Folder name is required' });
      return;
    }

    // Check parent folder
    if (parentId) {
      const parent = await prisma.folder.findFirst({
        where: { id: parentId, workspaceId }
      });
      if (!parent) {
        res.status(400).json({ error: 'Parent folder not found' });
        return;
      }
    }

    // Check unique constraint in target folder level
    const existing = await prisma.folder.findFirst({
      where: {
        name,
        parentId: parentId || null,
        workspaceId
      }
    });

    if (existing) {
      res.status(400).json({ error: 'A folder with this name already exists in this directory' });
      return;
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        parentId: parentId || null,
        workspaceId,
        color: color || null
      }
    });

    res.status(201).json({ success: true, data: folder });
  } catch (error) {
    console.error('createFolderController Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteFolderController = async (req: Request & { workspaceId?: string; user?: { workspaceId: string } }, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    const { id } = req.params;

    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized: No workspace context' });
      return;
    }

    const folder = await prisma.folder.findFirst({
      where: { id: id as string, workspaceId }
    });

    if (!folder) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }

    // Recursively collect all folders to delete
    const folderIds: string[] = [id as string, ...(await getAllSubfolderIds(id as string))];

    // Find all files in these folders to delete them from S3/R2
    const files = await prisma.mediaFile.findMany({
      where: {
        folderId: { in: folderIds },
        workspaceId
      }
    });

    // Delete files from S3/R2
    let totalStorageFreed = BigInt(0);
    for (const file of files) {
      const parts = file.cdnUrl.split('/');
      const filename = parts.pop();
      const folderName = parts.pop();
      const key = `${folderName}/${filename}`;

      const deleteCommand = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      });

      try {
        await s3Client.send(deleteCommand);
      } catch (s3Error) {
        console.error(`Failed to delete file ${file.id} from S3/R2:`, s3Error);
      }
      totalStorageFreed += file.optimizedSize;
    }

    // Delete files from DB
    await prisma.mediaFile.deleteMany({
      where: { id: { in: files.map(f => f.id) } }
    });

    // Delete folders (Cascades to subfolders automatically because of onDelete: Cascade on the parent relation)
    await prisma.folder.delete({
      where: { id: id as string }
    });

    // Update workspace storage
    if (totalStorageFreed > BigInt(0)) {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          storageUsed: { decrement: totalStorageFreed }
        }
      });
    }

    // Log Activity
    await prisma.activityLog.create({
      data: {
        type: 'FILE_DELETED',
        description: `Deleted folder ${folder.name} and all its contents via API`,
        workspaceId,
        userId: null,
      }
    });

    res.status(200).json({ success: true, message: 'Folder and contents deleted successfully' });
  } catch (error) {
    console.error('deleteFolderController Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
