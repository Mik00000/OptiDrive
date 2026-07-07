import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, BUCKET_NAME } from '../config/s3';
import { ZipArchive } from 'archiver';
import { getAllSubfolderIds } from './folders.controller';
import bcrypt from 'bcryptjs';

export const getShareLinkInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = req.params.slug as string;
    const password = req.body.password as string | undefined;

    const shareLink: any = await prisma.shareLink.findUnique({
      where: { slug },
      include: {
        file: true,
        folder: true,
        workspace: {
          select: { name: true }
        }
      }
    });

    if (!shareLink) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }

    // Перевірка кастомного домену: лінк має належати тому ж воркспейсу, що й домен
    if ((req as any).customDomain && shareLink.workspaceId !== (req as any).customDomain.workspaceId) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }

    // Перевіряємо чи воркспейс заморожено
    const { isWorkspaceLocked } = await import('../utils/workspace-status');
    const locked = await isWorkspaceLocked(shareLink.workspaceId);
    if (locked) {
      res.status(403).json({ error: 'This share link is temporarily unavailable because the source workspace is locked.' });
      return;
    }

    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      res.status(410).json({ error: 'Link has expired' });
      return;
    }

    // Require password if set
    if (shareLink.password) {
      if (!password) {
        res.status(401).json({ requirePassword: true });
        return;
      }
      const isValid = await bcrypt.compare(password, shareLink.password);
      if (!isValid) {
        // Fallback for old plain-text passwords just in case during transition
        if (shareLink.password !== password) {
          res.status(403).json({ error: 'Incorrect password' });
          return;
        }
      }
    }

    let payload: any = {
      isFolder: shareLink.isFolder,
      workspaceName: shareLink.workspace.name,
    };

    if (shareLink.isFolder && shareLink.folder) {
      payload.name = shareLink.folder.name;
      
      const subfolders = await prisma.folder.findMany({
        where: { parentId: shareLink.folder.id, workspaceId: shareLink.workspaceId },
        select: { id: true, name: true }
      });
      const files = await prisma.mediaFile.findMany({
        where: { folderId: shareLink.folder.id, workspaceId: shareLink.workspaceId, isDeleted: false },
        select: { id: true, name: true, format: true, optimizedSize: true, cdnUrl: true }
      });
      const serializedFiles = files.map((f: any) => ({
        ...f,
        optimizedSize: f.optimizedSize ? Number(f.optimizedSize) : 0
      }));
      payload.children = { folders: subfolders, files: serializedFiles };
    } else if (!shareLink.isFolder && shareLink.file) {
      payload.name = shareLink.file.name;
      payload.size = Number(shareLink.file.optimizedSize);
      payload.format = shareLink.file.format;
      
      let finalCdnUrl = shareLink.file.cdnUrl;
      if (shareLink.transformationParams) {
        // Direct S3/R2 CDN URLs do not support dynamic on-the-fly transformations.
        // We route the request through our public view API to apply crop/watermark.
        finalCdnUrl = `/api/public/media/view/${shareLink.file.id}?${shareLink.transformationParams}`;
      }
      payload.cdnUrl = finalCdnUrl; // They can preview it!
    }

    res.status(200).json({ data: payload });
  } catch (error) {
    console.error('getShareLinkInfo Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const downloadShareLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = req.params.slug as string;
    const password = req.query.password as string | undefined;

    const shareLink: any = await prisma.shareLink.findUnique({
      where: { slug },
      include: { file: true, folder: true }
    });

    if (!shareLink) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }

    // Перевірка кастомного домену: лінк має належати тому ж воркспейсу, що й домен
    if ((req as any).customDomain && shareLink.workspaceId !== (req as any).customDomain.workspaceId) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }

    // Перевіряємо чи воркспейс заморожено
    const { isWorkspaceLocked } = await import('../utils/workspace-status');
    const locked = await isWorkspaceLocked(shareLink.workspaceId);
    if (locked) {
      res.status(403).json({ error: 'This share link is temporarily unavailable because the source workspace is locked.' });
      return;
    }

    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      res.status(410).json({ error: 'Link has expired' });
      return;
    }

    if (shareLink.password) {
      if (!password) {
        res.status(401).json({ error: 'Password required' });
        return;
      }
      const isValid = await bcrypt.compare(password, shareLink.password);
      if (!isValid) {
        if (shareLink.password !== password) {
          res.status(403).json({ error: 'Unauthorized access' });
          return;
        }
      }
    }

    // Increment downloads count asynchronously
    prisma.shareLink.update({
      where: { id: shareLink.id },
      data: { downloads: { increment: 1 } }
    }).catch(console.error);

    if (shareLink.isFolder && shareLink.folderId) {
      const folder = shareLink.folder!;
      const folderIds = [folder.id, ...(await getAllSubfolderIds(folder.id))];

      const files = await prisma.mediaFile.findMany({
        where: { folderId: { in: folderIds }, workspaceId: shareLink.workspaceId, isDeleted: false }
      });

      // Increment bandwidthUsed in workspace
      let totalFolderSize = BigInt(0);
      for (const file of files) {
        totalFolderSize += file.optimizedSize;
      }
      if (totalFolderSize > BigInt(0)) {
        await prisma.workspace.update({
          where: { id: shareLink.workspaceId },
          data: {
            bandwidthUsed: { increment: totalFolderSize }
          }
        }).catch((err: any) => console.error('[Bandwidth] Failed to update downloadShareLink folder bandwidth:', err));
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(folder.name)}.zip"`);

      const archive = new ZipArchive({ zlib: { level: 9 } });
      archive.pipe(res);

      const allFolders = await prisma.folder.findMany({
        where: { workspaceId: shareLink.workspaceId },
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
          if (!response.ok) continue;
          const arrayBuffer = await response.arrayBuffer();
          const relativePath = getRelativePath(file.folderId, folder.id);
          archive.append(Buffer.from(arrayBuffer), { name: `${relativePath}${file.name}` });
        } catch (err) {}
      }

      await archive.finalize();

    } else if (shareLink.fileId && shareLink.file) {
      const file = shareLink.file;
      const urlParts = file.cdnUrl.split('/');
      const filename = urlParts[urlParts.length - 1];

      if (shareLink.transformationParams) {
        // Parse transformation parameters and mock the request
        const params = new URLSearchParams(shareLink.transformationParams);
        const queryObj: Record<string, string> = {};
        params.forEach((value, key) => {
          queryObj[key] = value;
        });

        req.query = queryObj;
        req.params = {
          id: shareLink.fileId
        };

        // Set content disposition to download it as an attachment
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);

        // Delegate to viewMediaFileOnTheFly
        const { viewMediaFileOnTheFly } = await import('./public-media.controller');
        return viewMediaFileOnTheFly(req, res);
      }

      const fileKey = `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}`;

      const { getS3ConfigForWorkspace, s3Client: defaultS3Client, BUCKET_NAME: defaultBucketName } = await import('../config/s3');
      const { client, bucketName } = await getS3ConfigForWorkspace(shareLink.workspaceId);

      let activeClient = client;
      let activeBucket = bucketName;

      if (client !== defaultS3Client) {
        const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
        try {
          await client.send(new HeadObjectCommand({ Bucket: bucketName, Key: fileKey }));
        } catch (err) {
          activeClient = defaultS3Client;
          activeBucket = defaultBucketName;
        }
      }

      const command = new GetObjectCommand({
        Bucket: activeBucket,
        Key: fileKey,
        ResponseContentDisposition: `attachment; filename="${encodeURIComponent(file.name)}"`,
      });

      const presignedUrl = await getSignedUrl(activeClient, command, { expiresIn: 3600 });

      // Increment bandwidthUsed in workspace
      await prisma.workspace.update({
        where: { id: shareLink.workspaceId },
        data: {
          bandwidthUsed: { increment: file.optimizedSize }
        }
      }).catch((err: any) => console.error('[Bandwidth] Failed to update downloadShareLink file bandwidth:', err));

      res.redirect(presignedUrl);
    } else {
      res.status(404).json({ error: 'Target not found' });
    }
  } catch (error) {
    console.error('downloadShareLink Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
