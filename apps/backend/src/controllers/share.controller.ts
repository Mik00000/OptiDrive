import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export const createShareLink = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { fileId, folderId, password, expiresInDays, transformationParams } = req.body;

    if (!fileId && !folderId) {
      res.status(400).json({ error: 'Either fileId or folderId is required' });
      return;
    }

    if (fileId && folderId) {
      res.status(400).json({ error: 'Provide only fileId or folderId, not both' });
      return;
    }

    if (fileId) {
      const file = await prisma.mediaFile.findUnique({ where: { id: fileId } });
      if (!file || file.workspaceId !== workspaceId) {
        res.status(403).json({ error: 'File not found or unauthorized' });
        return;
      }
    } else if (folderId) {
      const folder = await prisma.folder.findUnique({ where: { id: folderId } });
      if (!folder || folder.workspaceId !== workspaceId) {
        res.status(403).json({ error: 'Folder not found or unauthorized' });
        return;
      }
    }

    const slug = crypto.randomBytes(4).toString('hex'); // 8 characters
    let expiresAt: Date | null = null;
    
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays, 10));
    }

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const shareLink = await prisma.shareLink.create({
      data: {
        slug,
        isFolder: !!folderId,
        fileId: fileId || null,
        folderId: folderId || null,
        password: hashedPassword,
        transformationParams: transformationParams || null,
        expiresAt,
        workspaceId,
      }
    });

    // Log Activity
    let targetName = 'Item';
    if (fileId) {
      const file = await prisma.mediaFile.findUnique({ where: { id: fileId }, select: { name: true } });
      if (file) targetName = `file "${file.name}"`;
    } else if (folderId) {
      const folder = await prisma.folder.findUnique({ where: { id: folderId }, select: { name: true } });
      if (folder) targetName = `folder "${folder.name}"`;
    }

    await prisma.activityLog.create({
      data: {
        type: 'SETTING_CHANGED',
        description: `Created public share link for ${targetName} (slug: ${slug})`,
        workspaceId,
        userId: req.user?.userId || null,
      }
    });

    res.status(201).json({ data: shareLink });
  } catch (error) {
    console.error('createShareLink Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const listShareLinks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { fileId, folderId } = req.query;

    const where: any = { workspaceId };
    if (fileId) where.fileId = String(fileId);
    if (folderId) where.folderId = String(folderId);

    const shareLinks = await prisma.shareLink.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ data: shareLinks });
  } catch (error) {
    console.error('listShareLinks Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteShareLink = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    const id = req.params.id as string;

    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const shareLink = await prisma.shareLink.findFirst({
      where: { id, workspaceId }
    });

    if (!shareLink) {
      res.status(404).json({ error: 'Share link not found' });
      return;
    }

    await prisma.shareLink.delete({
      where: { id }
    });

    // Log Activity
    let targetName = 'Item';
    if (shareLink.fileId) {
      const file = await prisma.mediaFile.findUnique({ where: { id: shareLink.fileId }, select: { name: true } });
      if (file) targetName = `file "${file.name}"`;
    } else if (shareLink.folderId) {
      const folder = await prisma.folder.findUnique({ where: { id: shareLink.folderId }, select: { name: true } });
      if (folder) targetName = `folder "${folder.name}"`;
    }

    await prisma.activityLog.create({
      data: {
        type: 'SETTING_CHANGED',
        description: `Deleted public share link for ${targetName} (slug: ${shareLink.slug})`,
        workspaceId,
        userId: req.user?.userId || null,
      }
    });

    res.status(200).json({ success: true, message: 'Share link deleted' });
  } catch (error) {
    console.error('deleteShareLink Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
