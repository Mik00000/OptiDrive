import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { triggerWebhooks } from '../services/webhook.service';
import { s3Client, BUCKET_NAME } from '../config/s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ZipArchive } from 'archiver';
import { Readable } from 'stream';

// Recursively get all children folder IDs
export async function getAllSubfolderIds(folderId: string): Promise<string[]> {
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

export const createFolder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, parentId, color } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Folder name is required' });
      return;
    }

    // If parentId is provided, check if parent folder exists and belongs to same workspace
    if (parentId) {
      const parent = await prisma.folder.findFirst({
        where: { id: parentId, workspaceId }
      });
      if (!parent) {
        res.status(400).json({ error: 'Parent folder not found' });
        return;
      }
    }

    // Check uniqueness of name in current directory
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
        color: color || null,
      }
    });

    // Trigger Webhooks
    triggerWebhooks(workspaceId, 'folder.created', {
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
      color: folder.color,
      createdAt: folder.createdAt
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        type: 'FILE_UPLOADED',
        description: `Created folder ${folder.name}`,
        workspaceId,
        userId: req.user?.userId || null,
      }
    });

    res.status(201).json({ success: true, data: folder });
  } catch (error) {
    console.error('createFolder Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getFolders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const all = req.query.all === 'true';
    if (all) {
      const folders = await prisma.folder.findMany({
        where: { workspaceId, isDeleted: false },
        orderBy: { name: 'asc' }
      });
      res.status(200).json({ data: folders });
      return;
    }

    const parentId = req.query.parentId === 'null' || !req.query.parentId ? null : String(req.query.parentId);

    const folders = await prisma.folder.findMany({
      where: {
        workspaceId,
        parentId,
        isDeleted: false
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({ data: folders });
  } catch (error) {
    console.error('getFolders Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const renameFolder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    const folderId = req.params.id as string;
    const { name, color } = req.body;

    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!name && color === undefined) {
      res.status(400).json({ error: 'Folder name or color is required' });
      return;
    }

    const folder = await prisma.folder.findFirst({
      where: { id: folderId, workspaceId }
    });

    if (!folder) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }

    // Check uniqueness in target directory if name is changed
    if (name && name !== folder.name) {
      const existing = await prisma.folder.findFirst({
        where: {
          name,
          parentId: folder.parentId,
          workspaceId,
          id: { not: folderId }
        }
      });

      if (existing) {
        res.status(400).json({ error: 'A folder with this name already exists in this directory' });
        return;
      }
    }

    const updated = await prisma.folder.update({
      where: { id: folderId },
      data: {
        name: name !== undefined ? name : undefined,
        color: color !== undefined ? color : undefined,
      }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        type: 'SETTING_CHANGED',
        description: `Renamed folder ${folder.name} to ${updated.name}`,
        workspaceId,
        userId: req.user?.userId || null,
      }
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('renameFolder Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteFolder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    const folderId = req.params.id as string;

    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const folder = await prisma.folder.findFirst({
      where: { id: folderId, workspaceId, isDeleted: false }
    });

    if (!folder) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }

    // Recursively collect all folders to soft delete
    const folderIds: string[] = [folderId, ...(await getAllSubfolderIds(folderId))];

    // Soft delete all files inside these folders
    await prisma.mediaFile.updateMany({
      where: {
        folderId: { in: folderIds },
        workspaceId
      },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    // Soft delete all folders
    await prisma.folder.updateMany({
      where: {
        id: { in: folderIds },
        workspaceId
      },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        type: 'FILE_DELETED',
        description: `Moved folder ${folder.name} and all its contents to Trash`,
        workspaceId,
        userId: req.user?.userId || null,
      }
    });

    // Trigger Webhooks
    triggerWebhooks(workspaceId, 'folder.deleted', {
      id: folderId,
      name: folder.name,
      subfolderIds: folderIds,
      deletedAt: new Date()
    });

    res.status(200).json({ success: true, message: 'Folder and contents moved to Trash' });
  } catch (error) {
    console.error('deleteFolder Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

async function resolveFolderNameConflict(workspaceId: string, parentId: string | null, originalName: string): Promise<string> {
  let name = originalName;
  let count = 1;
  while (true) {
    const existing = await prisma.folder.findFirst({
      where: { workspaceId, parentId, name }
    });
    if (!existing) break;
    name = `${originalName} (${count})`;
    count++;
  }
  return name;
}

async function resolveFileNameConflict(workspaceId: string, folderId: string | null, originalName: string): Promise<string> {
  let name = originalName;
  const extIndex = originalName.lastIndexOf('.');
  const baseName = extIndex !== -1 ? originalName.slice(0, extIndex) : originalName;
  const ext = extIndex !== -1 ? originalName.slice(extIndex) : '';
  
  let count = 1;
  while (true) {
    const existing = await prisma.mediaFile.findFirst({
      where: { workspaceId, folderId, name }
    });
    if (!existing) break;
    name = `${baseName} (${count})${ext}`;
    count++;
  }
  return name;
}

export const moveItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { folderIds = [], fileIds = [], targetFolderId } = req.body;

    // Validate target folder
    if (targetFolderId) {
      const targetFolder = await prisma.folder.findFirst({
        where: { id: targetFolderId, workspaceId }
      });
      if (!targetFolder) {
        res.status(400).json({ error: 'Target folder not found' });
        return;
      }
    }

    // Move files
    if (fileIds.length > 0) {
      for (const fileId of fileIds) {
        const file = await prisma.mediaFile.findFirst({
          where: { id: fileId, workspaceId }
        });
        if (file) {
          const newName = await resolveFileNameConflict(workspaceId, targetFolderId || null, file.name);
          await prisma.mediaFile.update({
            where: { id: fileId },
            data: {
              folderId: targetFolderId || null,
              name: newName
            }
          });
        }
      }
    }

    // Move folders
    if (folderIds.length > 0) {
      // Prevent cyclic moving (moving a folder inside itself or its children)
      for (const fId of folderIds) {
        if (fId === targetFolderId) {
          res.status(400).json({ error: 'Cannot move a folder inside itself' });
          return;
        }
        const subfolderIds = await getAllSubfolderIds(fId);
        if (subfolderIds.includes(targetFolderId)) {
          res.status(400).json({ error: 'Cannot move a folder inside one of its subfolders' });
          return;
        }
      }

      for (const fId of folderIds) {
        const folder = await prisma.folder.findFirst({
          where: { id: fId, workspaceId }
        });
        if (folder) {
          const newName = await resolveFolderNameConflict(workspaceId, targetFolderId || null, folder.name);
          await prisma.folder.update({
            where: { id: fId },
            data: {
              parentId: targetFolderId || null,
              name: newName
            }
          });
        }
      }
    }

    // Log Activity
    const desc = `Moved ${folderIds.length} folder(s) and ${fileIds.length} file(s) to a new directory`;
    await prisma.activityLog.create({
      data: {
        type: 'SETTING_CHANGED',
        description: desc,
        workspaceId,
        userId: req.user?.userId || null,
      }
    });

    res.status(200).json({ success: true, message: 'Items moved successfully' });
  } catch (error) {
    console.error('moveItems Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getFolderNavigationPath = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    const folderId = req.params.id as string;

    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const path: { id: string; name: string }[] = [];
    let currentId: string | null = folderId || null;

    while (currentId) {
      const folder = await prisma.folder.findFirst({
        where: { id: currentId, workspaceId },
        select: { id: true, name: true, parentId: true }
      });

      if (!folder) break;

      path.unshift({ id: folder.id, name: folder.name });
      currentId = folder.parentId;
    }

    res.status(200).json({ data: path });
  } catch (error) {
    console.error('getFolderNavigationPath Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const downloadFolder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    const folderId = req.params.id as string;

    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const folder = await prisma.folder.findFirst({
      where: { id: folderId, workspaceId }
    });

    if (!folder) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }

    const folderIds = [folderId, ...(await getAllSubfolderIds(folderId))];

    const files = await prisma.mediaFile.findMany({
      where: {
        folderId: { in: folderIds },
        workspaceId,
        isDeleted: false
      }
    });

    // Increment bandwidthUsed in workspace
    let totalFolderSize = BigInt(0);
    for (const file of files) {
      totalFolderSize += file.optimizedSize;
    }
    if (totalFolderSize > BigInt(0)) {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          bandwidthUsed: { increment: totalFolderSize }
        }
      }).catch((err: any) => console.error('[Bandwidth] Failed to update downloadFolder bandwidth:', err));
    }

    // Set headers for download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(folder.name)}.zip"`);

    const archive = new ZipArchive({ zlib: { level: 9 } });
    
    // Pipe archive to response
    archive.pipe(res);

    // Fetch all folders to construct paths in memory
    const allFolders = await prisma.folder.findMany({
      where: { workspaceId },
      select: { id: true, name: true, parentId: true }
    });

    const folderMap = new Map<string, { name: string, parentId: string | null }>();
    for (const f of allFolders) {
      folderMap.set(f.id, { name: f.name, parentId: f.parentId });
    }

    function getRelativePath(fId: string | null, targetId: string): string {
      if (!fId || fId === targetId) return '';
      const parts: string[] = [];
      let currentId: string | null = fId;
      while (currentId && currentId !== targetId) {
        const f = folderMap.get(currentId);
        if (!f) break;
        parts.unshift(f.name);
        currentId = f.parentId;
      }
      return parts.join('/') + '/';
    }

    for (const file of files) {
      try {
        const response = await fetch(file.cdnUrl);
        if (!response.ok) {
          console.error(`Failed to fetch file ${file.id} from CDN: ${response.statusText}`);
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const relativePath = getRelativePath(file.folderId, folderId);
        archive.append(buffer, { name: `${relativePath}${file.name}` });
      } catch (err) {
        console.error(`Failed to fetch file ${file.id} from CDN for zip:`, err);
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('downloadFolder Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};
