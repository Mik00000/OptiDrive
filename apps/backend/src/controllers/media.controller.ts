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

    const folderId = req.query.folderId === 'null' || !req.query.folderId ? null : String(req.query.folderId);
    const search = req.query.search ? String(req.query.search) : undefined;

    let mediaFiles;
    let folders;

    if (search) {
      mediaFiles = await prisma.mediaFile.findMany({
        where: {
          workspaceId,
          name: { contains: search, mode: 'insensitive' },
          isDeleted: false
        },
        include: {
          tags: true
        },
        orderBy: { createdAt: 'desc' },
      });

      folders = await prisma.folder.findMany({
        where: {
          workspaceId,
          name: { contains: search, mode: 'insensitive' },
          isDeleted: false
        },
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { files: true, children: true }
          },
          tags: true
        }
      });
    } else {
      mediaFiles = await prisma.mediaFile.findMany({
        where: { workspaceId, folderId, isDeleted: false },
        include: {
          tags: true
        },
        orderBy: { createdAt: 'desc' },
      });

      folders = await prisma.folder.findMany({
        where: { workspaceId, parentId: folderId, isDeleted: false },
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { files: true, children: true }
          },
          tags: true
        }
      });
    }

    // Fetch all folders to construct paths and hierarchy in memory
    const allFolders = await prisma.folder.findMany({
      where: { workspaceId, isDeleted: false },
      select: { id: true, name: true, parentId: true }
    });

    const folderMap = new Map<string, { name: string, parentId: string | null }>();
    const childFoldersMap = new Map<string, string[]>(); // parentId -> childIds
    for (const f of allFolders) {
      folderMap.set(f.id, { name: f.name, parentId: f.parentId });
      if (f.parentId) {
        const children = childFoldersMap.get(f.parentId) || [];
        children.push(f.id);
        childFoldersMap.set(f.parentId, children);
      }
    }

    // Fetch all file sizes to construct folder sizes in memory
    const allFilesSize = await prisma.mediaFile.findMany({
      where: { workspaceId, isDeleted: false },
      select: { folderId: true, originalSize: true, optimizedSize: true }
    });

    const folderDirectOptimizedSizeMap = new Map<string, bigint>();
    const folderDirectOriginalSizeMap = new Map<string, bigint>();
    for (const file of allFilesSize) {
      if (file.folderId) {
        const curOpt = folderDirectOptimizedSizeMap.get(file.folderId) || BigInt(0);
        folderDirectOptimizedSizeMap.set(file.folderId, curOpt + file.optimizedSize);

        const curOrig = folderDirectOriginalSizeMap.get(file.folderId) || BigInt(0);
        folderDirectOriginalSizeMap.set(file.folderId, curOrig + file.originalSize);
      }
    }

    // Helper to calculate folder sizes recursively
    const memoFolderSizes = new Map<string, { original: number; optimized: number }>();
    function getRecursiveFolderSizes(folderId: string): { original: number; optimized: number } {
      if (memoFolderSizes.has(folderId)) return memoFolderSizes.get(folderId)!;
      
      let original = Number(folderDirectOriginalSizeMap.get(folderId) || BigInt(0));
      let optimized = Number(folderDirectOptimizedSizeMap.get(folderId) || BigInt(0));
      
      const childIds = childFoldersMap.get(folderId) || [];
      for (const childId of childIds) {
        const childSizes = getRecursiveFolderSizes(childId);
        original += childSizes.original;
        optimized += childSizes.optimized;
      }
      
      const result = { original, optimized };
      memoFolderSizes.set(folderId, result);
      return result;
    }

    // Helper to build path string
    function buildPathSync(folderId: string | null): string {
      if (!folderId) return 'Home';
      const path: string[] = [];
      let currentId: string | null = folderId;
      while (currentId) {
        const folder = folderMap.get(currentId);
        if (!folder) break;
        path.unshift(folder.name);
        currentId = folder.parentId;
      }
      return 'Home / ' + path.join(' / ');
    }

    const foldersWithDetails = folders.map(folder => {
      const sizes = getRecursiveFolderSizes(folder.id);
      return {
        ...folder,
        originalSize: sizes.original,
        optimizedSize: sizes.optimized,
        size: sizes.optimized, // fallback
        path: buildPathSync(folder.parentId)
      };
    });

    const filesWithDetails = mediaFiles.map(file => ({
      ...file,
      originalSize: Number(file.originalSize),
      optimizedSize: Number(file.optimizedSize),
      path: buildPathSync(file.folderId)
    }));

    res.status(200).json({ 
      data: {
        files: filesWithDetails,
        folders: foldersWithDetails
      }
    });
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
      where: { id: String(fileId), workspaceId: String(workspaceId), isDeleted: false },
    });

    if (!mediaFile) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Soft Delete
    await prisma.mediaFile.update({
      where: { id: String(fileId) },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    // Create Activity Log
    await prisma.activityLog.create({
      data: {
        type: 'FILE_DELETED',
        description: `Moved file ${mediaFile.name} to Trash`,
        workspaceId,
        userId: (req as any).user?.id || null,
      }
    });

    res.status(200).json({ success: true, message: 'File moved to Trash' });
  } catch (error) {
    console.error('deleteMediaFile Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateMediaFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    const fileId = req.params.id;
    const { name, tags } = req.body;

    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!name && tags === undefined) {
      res.status(400).json({ error: 'Name or tags are required' });
      return;
    }

    const mediaFile = await prisma.mediaFile.findFirst({
      where: { id: String(fileId), workspaceId: String(workspaceId) }
    });

    if (!mediaFile) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    if (tags !== undefined && Array.isArray(tags)) {
      // Disconnect all current tags first
      await prisma.mediaFile.update({
        where: { id: String(fileId) },
        data: {
          tags: { set: [] }
        }
      });
      
      // Connect/create the new ones
      await prisma.mediaFile.update({
        where: { id: String(fileId) },
        data: {
          name: name !== undefined ? name : undefined,
          tags: {
            connectOrCreate: tags.map((tagName: string) => {
              const cleanTagName = tagName.trim();
              return {
                where: {
                  name_workspaceId: {
                    name: cleanTagName,
                    workspaceId: workspaceId
                  }
                },
                create: {
                  name: cleanTagName,
                  workspaceId: workspaceId
                }
              };
            })
          }
        }
      });

      // Clean up orphaned tags in the workspace
      await prisma.tag.deleteMany({
        where: {
          workspaceId,
          files: { none: {} }
        }
      });
    } else if (name !== undefined) {
      await prisma.mediaFile.update({
        where: { id: String(fileId) },
        data: { name }
      });
    }

    res.status(200).json({ success: true, message: 'File updated successfully' });
  } catch (error) {
    console.error('updateMediaFile Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getWorkspaceTags = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tags = await prisma.tag.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({ data: tags });
  } catch (error) {
    console.error('getWorkspaceTags Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const downloadMediaFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    const fileId = req.params.id;

    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const mediaFile = await prisma.mediaFile.findFirst({
      where: { id: String(fileId), workspaceId: String(workspaceId) },
    });

    if (!mediaFile) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const response = await fetch(mediaFile.cdnUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch from CDN: ${response.statusText}`);
    }

    // Set headers to force download
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(mediaFile.name)}"`);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');

    // Pipe the response body to the client
    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      res.status(500).json({ error: 'Failed to read file stream' });
    }
  } catch (error) {
    console.error('downloadMediaFile Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
