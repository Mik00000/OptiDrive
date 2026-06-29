import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { s3Client, BUCKET_NAME } from '../config/s3';
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

export const getTrashItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
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

      // Sum sizes of all files under this directory
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

      // Counts
      const filesCount = filesInFolder.length;
      const subfolders = await prisma.folder.findMany({
        where: {
          id: { in: folderIds.filter(id => id !== folder.id) }
        }
      });
      const subfoldersCount = subfolders.length;

      return {
        ...folder,
        originalSize: Number(originalSizeSum),
        optimizedSize: Number(optimizedSizeSum),
        savings,
        filesCount,
        subfoldersCount
      };
    }));

    // Format files (convert BigInt size properties to Number)
    const formattedFiles = files.map((file: any) => ({
      ...file,
      originalSize: Number(file.originalSize),
      optimizedSize: Number(file.optimizedSize)
    }));

    res.status(200).json({
      success: true,
      data: {
        folders: foldersWithDetails,
        files: formattedFiles
      }
    });
  } catch (error) {
    console.error('getTrashItems Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const restoreFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    const fileId = req.params.id;

    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const file = await prisma.mediaFile.findFirst({
      where: { id: String(fileId), workspaceId, isDeleted: true }
    });

    if (!file) {
      res.status(404).json({ error: 'File not found in Trash' });
      return;
    }

    // Restore file
    await prisma.mediaFile.update({
      where: { id: String(fileId) },
      data: {
        isDeleted: false,
        deletedAt: null
      }
    });

    // Recursively restore ancestors if needed
    if (file.folderId) {
      await restoreFolderAncestors(file.folderId, workspaceId);
    }

    // Log Activity
    await prisma.activityLog.create({
      data: {
        type: 'FILE_UPLOADED',
        description: `Restored file ${file.name} from Trash`,
        workspaceId,
        userId: req.user?.userId || null
      }
    });

    res.status(200).json({ success: true, message: 'File restored successfully' });
  } catch (error) {
    console.error('restoreFile Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const restoreFolder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    const folderId = req.params.id;

    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const folder = await prisma.folder.findFirst({
      where: { id: String(folderId), workspaceId, isDeleted: true }
    });

    if (!folder) {
      res.status(404).json({ error: 'Folder not found in Trash' });
      return;
    }

    const folderIds = [String(folderId), ...(await getAllSubfolderIdsIncludingDeleted(String(folderId)))];

    // Restore all folders recursively
    await prisma.folder.updateMany({
      where: {
        id: { in: folderIds },
        workspaceId
      },
      data: {
        isDeleted: false,
        deletedAt: null
      }
    });

    // Restore all files inside recursively
    await prisma.mediaFile.updateMany({
      where: {
        folderId: { in: folderIds },
        workspaceId
      },
      data: {
        isDeleted: false,
        deletedAt: null
      }
    });

    // Restore parent folders if this folder was nested inside a deleted folder
    if (folder.parentId) {
      await restoreFolderAncestors(folder.parentId, workspaceId);
    }

    // Log Activity
    await prisma.activityLog.create({
      data: {
        type: 'WORKSPACE_CREATED',
        description: `Restored folder ${folder.name} and all its contents from Trash`,
        workspaceId,
        userId: req.user?.userId || null
      }
    });

    res.status(200).json({ success: true, message: 'Folder restored successfully' });
  } catch (error) {
    console.error('restoreFolder Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const restoreBulk = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { folderIds = [], fileIds = [] } = req.body;

    if (!Array.isArray(folderIds) || !Array.isArray(fileIds)) {
      res.status(400).json({ error: 'Invalid folderIds or fileIds parameter' });
      return;
    }

    // Restore files
    if (fileIds.length > 0) {
      const files = await prisma.mediaFile.findMany({
        where: { id: { in: fileIds }, workspaceId, isDeleted: true }
      });

      await prisma.mediaFile.updateMany({
        where: { id: { in: fileIds }, workspaceId },
        data: { isDeleted: false, deletedAt: null }
      });

      for (const file of files) {
        if (file.folderId) {
          await restoreFolderAncestors(file.folderId, workspaceId);
        }
      }
    }

    // Restore folders
    if (folderIds.length > 0) {
      for (const fId of folderIds) {
        const folder = await prisma.folder.findFirst({
          where: { id: fId, workspaceId, isDeleted: true }
        });
        if (folder) {
          const subfolderIds = [fId, ...(await getAllSubfolderIdsIncludingDeleted(fId))];

          await prisma.folder.updateMany({
            where: { id: { in: subfolderIds }, workspaceId },
            data: { isDeleted: false, deletedAt: null }
          });

          await prisma.mediaFile.updateMany({
            where: { folderId: { in: subfolderIds }, workspaceId },
            data: { isDeleted: false, deletedAt: null }
          });

          if (folder.parentId) {
            await restoreFolderAncestors(folder.parentId, workspaceId);
          }
        }
      }
    }

    // Log Activity
    await prisma.activityLog.create({
      data: {
        type: 'FILE_UPLOADED',
        description: `Restored ${fileIds.length} files and ${folderIds.length} folders from Trash`,
        workspaceId,
        userId: req.user?.userId || null
      }
    });

    res.status(200).json({ success: true, message: 'Items restored successfully' });
  } catch (error) {
    console.error('restoreBulk Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteFilePermanently = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    const fileId = req.params.id;

    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const file = await prisma.mediaFile.findFirst({
      where: { id: String(fileId), workspaceId, isDeleted: true }
    });

    if (!file) {
      res.status(404).json({ error: 'File not found in Trash' });
      return;
    }

    // Delete from S3/R2
    const parts = file.cdnUrl.split('/');
    const filename = parts.pop();
    const folder = parts.pop();
    const key = `${folder}/${filename}`;

    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    try {
      await s3Client.send(deleteCommand);
    } catch (s3Error) {
      console.error('Failed to delete from S3/R2:', s3Error);
    }

    // Delete from DB
    await prisma.mediaFile.delete({
      where: { id: String(fileId) }
    });

    // Reduce storage usage
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        storageUsed: { decrement: file.optimizedSize }
      }
    });

    // Clean up orphaned tags in the workspace
    await prisma.tag.deleteMany({
      where: {
        workspaceId,
        files: { none: {} }
      }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        type: 'FILE_DELETED',
        description: `Permanently deleted file ${file.name}`,
        workspaceId,
        userId: req.user?.userId || null
      }
    });

    res.status(200).json({ success: true, message: 'File deleted permanently' });
  } catch (error) {
    console.error('deleteFilePermanently Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteFolderPermanently = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    const folderId = req.params.id;

    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const folder = await prisma.folder.findFirst({
      where: { id: String(folderId), workspaceId, isDeleted: true }
    });

    if (!folder) {
      res.status(404).json({ error: 'Folder not found in Trash' });
      return;
    }

    const folderIds = [String(folderId), ...(await getAllSubfolderIdsIncludingDeleted(String(folderId)))];

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
      where: { id: { in: files.map((f: any) => f.id) } }
    });

    // Delete folders (Cascades to subfolders automatically because of onDelete: Cascade on the parent relation)
    await prisma.folder.delete({
      where: { id: String(folderId) }
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

    // Clean up orphaned tags in the workspace
    await prisma.tag.deleteMany({
      where: {
        workspaceId,
        files: { none: {} }
      }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        type: 'FILE_DELETED',
        description: `Permanently deleted folder ${folder.name} and all its contents`,
        workspaceId,
        userId: req.user?.userId || null
      }
    });

    res.status(200).json({ success: true, message: 'Folder and contents deleted permanently' });
  } catch (error) {
    console.error('deleteFolderPermanently Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteBulkPermanently = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { folderIds = [], fileIds = [] } = req.body;

    if (!Array.isArray(folderIds) || !Array.isArray(fileIds)) {
      res.status(400).json({ error: 'Invalid folderIds or fileIds parameter' });
      return;
    }

    let totalStorageFreed = BigInt(0);

    // 1. Delete files permanently
    if (fileIds.length > 0) {
      const files = await prisma.mediaFile.findMany({
        where: { id: { in: fileIds }, workspaceId, isDeleted: true }
      });

      if (files.length > 0) {
        for (const file of files) {
          const parts = file.cdnUrl.split('/');
          const filename = parts.pop();
          const folder = parts.pop();
          const key = `${folder}/${filename}`;

          const deleteCommand = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
          });

          try {
            await s3Client.send(deleteCommand);
          } catch (s3Error) {
            console.error('Failed to delete from S3/R2:', s3Error);
          }
          totalStorageFreed += file.optimizedSize;
        }

        await prisma.mediaFile.deleteMany({
          where: { id: { in: files.map((f: any) => f.id) } }
        });
      }
    }

    // 2. Delete folders permanently
    if (folderIds.length > 0) {
      for (const fId of folderIds) {
        const folder = await prisma.folder.findFirst({
          where: { id: fId, workspaceId, isDeleted: true }
        });

        if (folder) {
          const subfolderIds = [fId, ...(await getAllSubfolderIdsIncludingDeleted(fId))];

          const filesInFolders = await prisma.mediaFile.findMany({
            where: { folderId: { in: subfolderIds }, workspaceId }
          });

          for (const file of filesInFolders) {
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
            where: { id: { in: filesInFolders.map((f: any) => f.id) } }
          });

          await prisma.folder.delete({
            where: { id: fId }
          });
        }
      }
    }

    // Update storage usage
    if (totalStorageFreed > BigInt(0)) {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          storageUsed: { decrement: totalStorageFreed }
        }
      });
    }

    // Clean up orphaned tags in the workspace
    await prisma.tag.deleteMany({
      where: {
        workspaceId,
        files: { none: {} }
      }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        type: 'FILE_DELETED',
        description: `Permanently deleted ${fileIds.length} files and ${folderIds.length} folders`,
        workspaceId,
        userId: req.user?.userId || null
      }
    });

    res.status(200).json({ success: true, message: 'Items deleted permanently' });
  } catch (error) {
    console.error('deleteBulkPermanently Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const emptyTrash = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Find all files in Trash
    const files = await prisma.mediaFile.findMany({
      where: { workspaceId, isDeleted: true }
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
      where: { id: { in: files.map((f: any) => f.id) } }
    });

    // Delete folders in Trash
    await prisma.folder.deleteMany({
      where: { workspaceId, isDeleted: true }
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

    // Clean up orphaned tags in the workspace
    await prisma.tag.deleteMany({
      where: {
        workspaceId,
        files: { none: {} }
      }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        type: 'FILE_DELETED',
        description: `Emptied Recycle Bin`,
        workspaceId,
        userId: req.user?.userId || null
      }
    });

    res.status(200).json({ success: true, message: 'Recycle Bin emptied successfully' });
  } catch (error) {
    console.error('emptyTrash Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
