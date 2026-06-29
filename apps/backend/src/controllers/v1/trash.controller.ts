import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { s3Client, BUCKET_NAME } from '../../config/s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

// Helper to recursively get all subfolders (including deleted ones)
async function getAllSubfolderIdsIncludingDeleted(folderId: string): Promise<string[]> {
  const subfolders = await prisma.folder.findMany({
    where: { parentId: folderId },
    select: { id: true }
  });

  let ids = subfolders.map((sf: any) => sf.id);
  for (const id of ids) {
    const subIds = await getAllSubfolderIdsIncludingDeleted(id);
    ids = ids.concat(subIds);
  }
  return ids;
}

export const listTrashV1Controller = async (req: Request & { workspaceId?: string; user?: { workspaceId: string } }, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Flat List: only folders/files soft-deleted whose parent is not deleted
    const folders = await prisma.folder.findMany({
      where: {
        workspaceId,
        isDeleted: true,
        OR: [
          { parentId: null },
          { parent: { isDeleted: false } }
        ]
      },
      orderBy: { deletedAt: 'desc' }
    });

    const files = await prisma.mediaFile.findMany({
      where: {
        workspaceId,
        isDeleted: true,
        OR: [
          { folderId: null },
          { folder: { isDeleted: false } }
        ]
      },
      orderBy: { deletedAt: 'desc' }
    });

    // For each folder, aggregate sizes and counts recursively
    const foldersWithDetails = await Promise.all(folders.map(async (folder: any) => {
      const folderIds = [folder.id, ...(await getAllSubfolderIdsIncludingDeleted(folder.id))];

      const filesInFolder = await prisma.mediaFile.findMany({
        where: {
          folderId: { in: folderIds },
          workspaceId
        },
        select: { originalSize: true, optimizedSize: true }
      });

      const originalSizeSum = filesInFolder.reduce((sum: bigint, f: any) => sum + f.originalSize, BigInt(0));
      const optimizedSizeSum = filesInFolder.reduce((sum: bigint, f: any) => sum + f.optimizedSize, BigInt(0));

      let savings = 0;
      if (originalSizeSum > BigInt(0)) {
        savings = Number((originalSizeSum - optimizedSizeSum) * BigInt(100) / originalSizeSum);
      }

      const filesCount = filesInFolder.length;
      const subfolders = await prisma.folder.findMany({
        where: {
          id: { in: folderIds.filter(id => id !== folder.id) }
        }
      });
      const subfoldersCount = subfolders.length;

      return {
        ...folder,
        originalSize: originalSizeSum.toString(),
        optimizedSize: optimizedSizeSum.toString(),
        savings,
        filesCount,
        subfoldersCount
      };
    }));

    const formattedFiles = files.map((file: any) => ({
      ...file,
      originalSize: file.originalSize.toString(),
      optimizedSize: file.optimizedSize.toString()
    }));

    res.status(200).json({
      success: true,
      data: {
        folders: foldersWithDetails,
        files: formattedFiles
      }
    });
  } catch (error) {
    console.error('listTrashV1Controller Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

async function restoreFolderAncestors(folderId: string, workspaceId: string): Promise<void> {
  const folder = await prisma.folder.findFirst({
    where: { id: folderId, workspaceId }
  });
  if (!folder) return;
  if (folder.isDeleted) {
    await prisma.folder.update({
      where: { id: folderId },
      data: { isDeleted: false, deletedAt: null }
    });
    if (folder.parentId) {
      await restoreFolderAncestors(folder.parentId, workspaceId);
    }
  }
}

export const restoreFileV1Controller = async (req: Request & { workspaceId?: string; user?: { workspaceId: string } }, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    const { id } = req.params;

    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const file = await prisma.mediaFile.findFirst({
      where: { id: String(id), workspaceId, isDeleted: true }
    });

    if (!file) {
      res.status(404).json({ error: 'File not found in Trash' });
      return;
    }

    await prisma.mediaFile.update({
      where: { id: String(id) },
      data: {
        isDeleted: false,
        deletedAt: null
      }
    });

    // Recursively restore ancestors if needed
    if (file.folderId) {
      await restoreFolderAncestors(file.folderId, workspaceId);
    }

    res.status(200).json({ success: true, message: 'File restored successfully' });
  } catch (error) {
    console.error('restoreFileV1Controller Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const restoreFolderV1Controller = async (req: Request & { workspaceId?: string; user?: { workspaceId: string } }, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    const { id } = req.params;

    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const folder = await prisma.folder.findFirst({
      where: { id: String(id), workspaceId, isDeleted: true }
    });

    if (!folder) {
      res.status(404).json({ error: 'Folder not found in Trash' });
      return;
    }

    const folderIds = [String(id), ...(await getAllSubfolderIdsIncludingDeleted(String(id)))];

    await prisma.folder.updateMany({
      where: { id: { in: folderIds }, workspaceId },
      data: { isDeleted: false, deletedAt: null }
    });

    await prisma.mediaFile.updateMany({
      where: { folderId: { in: folderIds }, workspaceId },
      data: { isDeleted: false, deletedAt: null }
    });

    // Also restore parent ancestors if folder was nested inside a deleted folder
    if (folder.parentId) {
      await restoreFolderAncestors(folder.parentId, workspaceId);
    }

    res.status(200).json({ success: true, message: 'Folder restored successfully' });
  } catch (error) {
    console.error('restoreFolderV1Controller Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const emptyTrashV1Controller = async (req: Request & { workspaceId?: string; user?: { workspaceId: string } }, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const files = await prisma.mediaFile.findMany({
      where: { workspaceId, isDeleted: true }
    });

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

    await prisma.mediaFile.deleteMany({
      where: { id: { in: files.map((f: any) => f.id) } }
    });

    await prisma.folder.deleteMany({
      where: { workspaceId, isDeleted: true }
    });

    if (totalStorageFreed > BigInt(0)) {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { storageUsed: { decrement: totalStorageFreed } }
      });
    }

    res.status(200).json({ success: true, message: 'Recycle Bin emptied successfully' });
  } catch (error) {
    console.error('emptyTrashV1Controller Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
