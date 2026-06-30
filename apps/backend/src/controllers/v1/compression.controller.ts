import { Request, Response } from 'express';
import { ApiRequest } from '../../middlewares/apiKey.middleware';
import { compressImage } from '../../services/compression.service';
import { prisma } from '../../config/prisma';
import { triggerWebhooks } from '../../services/webhook.service';
import { checkAndTriggerQuotaEmails } from '../../services/quota-alert.service';

export const compressImageController = async (req: Request & { workspaceId?: string; user?: { workspaceId: string } }, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized: No workspace context' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    const { buffer, mimetype } = req.file;

    const planLimits = (req as any).planLimits;
    if (planLimits && buffer.length > planLimits.maxFileSize) {
      const maxMb = planLimits.maxFileSize / (1024 * 1024);
      res.status(413).json({ error: `File size exceeds the limit for your plan (${maxMb} MB). Please upgrade your plan.` });
      return;
    }

    // Multer often parses filenames in latin1. If it contains garbled utf-8 (like Ð), we decode it.
    let originalname = req.file.originalname;
    if (/[\x80-\xFF]/.test(originalname) && !/[\u0400-\u04FF]/.test(originalname)) {
      try {
        originalname = Buffer.from(originalname, 'latin1').toString('utf8');
      } catch (e) {
        // Fallback
      }
    }

    // Parse options from req.body (Multipart forms send strings)
    const {
      format, quality, lossless, width, height, fit, stripMetadata, effort,
      sanitize, removeViewBox, multipass, floatPrecision,
      pages, colors, folderId, folderPath, tags
    } = req.body;

    // Check workspace plan and default compression settings
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        plan: true,
        defaultPreset: true,
        defaultFormat: true,
        defaultQuality: true,
        defaultStripMetadata: true,
        defaultMaxWidth: true,
        defaultMaxHeight: true,
        defaultFit: true
      }
    });

    const activePreset = req.body.preset || workspace?.defaultPreset || "web_balanced";

    let finalFormat = format;
    if (!finalFormat) {
      finalFormat = workspace?.defaultFormat || "auto";
    }

    let finalQuality = quality;
    if (!finalQuality) {
      if (activePreset === 'web_balanced') finalQuality = '80';
      else if (activePreset === 'ultra_light') finalQuality = '60';
      else if (activePreset === 'lossless') finalQuality = '100';
      else finalQuality = String(workspace?.defaultQuality || 80);
    }

    let finalStripMetadata = stripMetadata;
    if (finalStripMetadata === undefined || finalStripMetadata === null) {
      if (activePreset === 'lossless') finalStripMetadata = 'false';
      else if (workspace) finalStripMetadata = String(workspace.defaultStripMetadata);
      else finalStripMetadata = 'true';
    }

    let finalWidth = width;
    if (!finalWidth) {
      if (activePreset === 'ultra_light') finalWidth = '1080';
      else if (workspace?.defaultMaxWidth) finalWidth = String(workspace.defaultMaxWidth);
    }

    let finalHeight = height || (workspace?.defaultMaxHeight ? String(workspace.defaultMaxHeight) : undefined);
    let finalFit = fit || workspace?.defaultFit || "cover";

    // Handle "auto" format for raster
    let resolvedFormat = finalFormat;
    if (finalFormat === 'auto') {
      const accepts = req.headers.accept || '';
      if (accepts.includes('image/avif')) {
        resolvedFormat = 'avif';
      } else if (accepts.includes('image/webp')) {
        resolvedFormat = 'webp';
      } else {
        resolvedFormat = 'jpeg';
      }
    }

    if (workspace?.plan === 'FREE') {
      if (resolvedFormat === 'avif' || mimetype === 'image/svg+xml') {
        res.status(403).json({ error: 'AVIF format and SVG optimization are only available on PRO and ENTERPRISE plans' });
        return;
      }
    }

    // Determine target folder ID (auto-create folders if folderPath is provided)
    let targetFolderId: string | null = folderId && folderId !== 'null' ? folderId : null;

    if (folderPath && typeof folderPath === 'string') {
      const pathParts = folderPath.split('/').map((p: string) => p.trim()).filter(Boolean);
      let currentParentId: string | null = null;
      for (const part of pathParts) {
        let folderRecord: any = await prisma.folder.findFirst({
          where: {
            name: part,
            parentId: currentParentId,
            workspaceId
          }
        });
        
        if (!folderRecord) {
          folderRecord = await prisma.folder.create({
            data: {
              name: part,
              parentId: currentParentId,
              workspaceId
            }
          });
        }
        currentParentId = folderRecord.id;
      }
      targetFolderId = currentParentId;
    } else if (targetFolderId) {
      // Validate folderId if folderPath is not provided
      const folderExists = await prisma.folder.findFirst({
        where: { id: targetFolderId, workspaceId }
      });
      if (!folderExists) {
        res.status(400).json({ error: 'Invalid folderId' });
        return;
      }
    }

    // Prepare options
    const options = {
      raster: {
        ...(finalFormat ? { format: finalFormat } : {}),
        resolvedFormat: resolvedFormat as 'avif' | 'webp' | 'jpeg' | 'png',
        ...(finalQuality ? { quality: parseInt(finalQuality, 10) } : {}),
        lossless: lossless === 'true' || activePreset === 'lossless',
        ...(finalWidth ? { width: parseInt(finalWidth, 10) } : {}),
        ...(finalHeight ? { height: parseInt(finalHeight, 10) } : {}),
        ...(finalFit ? { fit: finalFit as 'cover' | 'contain' | 'inside' } : {}),
        stripMetadata: finalStripMetadata !== 'false',
        ...(effort ? { effort: parseInt(effort, 10) } : {}),
      },
      vector: {
        sanitize: true, // Always forced
        removeViewBox: removeViewBox === 'true',
        multipass: multipass === 'true',
        ...(floatPrecision ? { floatPrecision: parseInt(floatPrecision, 10) } : {}),
      },
      animation: {
        ...(finalFormat ? { format: finalFormat as 'webp' | 'gif' } : {}),
        ...(pages ? { pages: parseInt(pages, 10) } : {}),
        ...(colors ? { colors: parseInt(colors, 10) } : {}),
      }
    };

    // Compress and upload
    const result = await compressImage({
      buffer,
      originalFilename: originalname,
      mimetype,
      workspaceId,
      options,
    });

    // Calculate savings
    const originalSizeBigInt = BigInt(result.originalSize);
    const optimizedSizeBigInt = BigInt(result.optimizedSize);
    const savingsBytes = originalSizeBigInt - optimizedSizeBigInt;
    const savingsPercent = result.originalSize > 0 
      ? (Number(savingsBytes) / result.originalSize * 100) 
      : 0;

    // Parse tags if provided
    let tagNames: string[] = [];
    if (tags && typeof tags === 'string') {
      try {
        const parsed = JSON.parse(tags);
        if (Array.isArray(parsed)) {
          tagNames = parsed.map((t) => String(t).trim()).filter(Boolean);
        } else {
          tagNames = tags.split(',').map((t) => t.trim()).filter(Boolean);
        }
      } catch (e) {
        tagNames = tags.split(',').map((t) => t.trim()).filter(Boolean);
      }
    }

    // Save to MediaFile
    const mediaFile = await prisma.mediaFile.create({
      data: {
        name: originalname,
        format: result.format,
        originalSize: originalSizeBigInt,
        optimizedSize: optimizedSizeBigInt,
        savings: savingsPercent,
        cdnUrl: result.cdnUrl,
        workspaceId,
        folderId: targetFolderId,
        ...(tagNames.length > 0 ? {
          tags: {
            connectOrCreate: tagNames.map((tagName) => ({
              where: {
                name_workspaceId: {
                  name: tagName,
                  workspaceId
                }
              },
              create: {
                name: tagName,
                workspaceId
              }
            }))
          }
        } : {})
      }
    });

    // Update Analytics
    await prisma.analyticsLog.create({
      data: {
        statusCode: 200,
        bytesSaved: savingsBytes,
        workspaceId,
      }
    });

    // Create Activity Log
    await prisma.activityLog.create({
      data: {
        type: 'FILE_UPLOADED',
        description: `Compressed ${originalname} (${savingsPercent.toFixed(1)}% saved)`,
        workspaceId,
        userId: (req as any).user?.id || null,
      }
    });

    // Update Workspace Usage
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        storageUsed: { increment: optimizedSizeBigInt },
        monthlyOptimizations: { increment: 1 }
      }
    });

    // Check & trigger quota warning emails
    checkAndTriggerQuotaEmails(workspaceId).catch((err) => 
      console.error('[Quota Warning] Failed to check quota:', err)
    );

    // Trigger Webhooks
    triggerWebhooks(workspaceId, 'file.optimized', {
      id: mediaFile.id,
      name: originalname,
      format: result.format,
      originalSize: result.originalSize,
      optimizedSize: result.optimizedSize,
      savings: Number(savingsPercent.toFixed(2)),
      cdnUrl: result.cdnUrl,
      createdAt: mediaFile.createdAt,
    });

    res.status(200).json({
      success: true,
      message: 'Image compressed successfully',
      data: {
        id: mediaFile.id,
        originalSize: result.originalSize,
        optimizedSize: result.optimizedSize,
        savingsPercent: savingsPercent.toFixed(2),
        cdnUrl: result.cdnUrl,
        format: result.format,
      }
    });
  } catch (error: unknown) {
    console.error('Compression Controller Error:', error);
    
    // Log error in Analytics
    if (req.workspaceId) {
      prisma.analyticsLog.create({
        data: {
          statusCode: 500,
          bytesSaved: 0,
          workspaceId: req.workspaceId,
        }
      }).catch((err: any) => console.error('Failed to log analytics error', err));
    }

    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to compress image' });
  }
};
