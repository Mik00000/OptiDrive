import { Response } from 'express';
import { ApiRequest } from '../../middlewares/apiKey.middleware';
import { compressImage } from '../../services/compression.service';
import { prisma } from '../../config/prisma';

export const compressImageController = async (req: any, res: Response): Promise<void> => {
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
      pages, colors
    } = req.body;

    // Handle "auto" format for raster
    let resolvedFormat = format;
    if (format === 'auto') {
      const accepts = req.headers.accept || '';
      if (accepts.includes('image/avif')) {
        resolvedFormat = 'avif';
      } else if (accepts.includes('image/webp')) {
        resolvedFormat = 'webp';
      } else {
        resolvedFormat = 'jpeg';
      }
    }

    // Prepare options
    const options = {
      raster: {
        format, // Could be 'auto'
        resolvedFormat: resolvedFormat as any,
        quality: quality ? parseInt(quality, 10) : undefined,
        lossless: lossless === 'true',
        width: width ? parseInt(width, 10) : undefined,
        height: height ? parseInt(height, 10) : undefined,
        fit: fit as any,
        stripMetadata: stripMetadata !== 'false', // default true
        effort: effort ? parseInt(effort, 10) : undefined,
      },
      vector: {
        sanitize: true, // Always forced
        removeViewBox: removeViewBox === 'true',
        multipass: multipass === 'true',
        floatPrecision: floatPrecision ? parseInt(floatPrecision, 10) : undefined,
      },
      animation: {
        format: format as any,
        pages: pages ? parseInt(pages, 10) : undefined,
        colors: colors ? parseInt(colors, 10) : undefined,
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
    let savingsBytes = originalSizeBigInt - optimizedSizeBigInt;
    if (savingsBytes < 0n) savingsBytes = 0n; // Sometimes it might get slightly larger if already optimized
    const savingsPercent = result.originalSize > 0 
      ? (Number(savingsBytes) / result.originalSize * 100) 
      : 0;

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

    // Update Workspace Usage
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        storageUsed: { increment: optimizedSizeBigInt }
      }
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
  } catch (error: any) {
    console.error('Compression Controller Error:', error);
    
    // Log error in Analytics
    if (req.workspaceId) {
      prisma.analyticsLog.create({
        data: {
          statusCode: 500,
          bytesSaved: 0,
          workspaceId: req.workspaceId,
        }
      }).catch(err => console.error('Failed to log analytics error', err));
    }

    res.status(500).json({ error: error.message || 'Failed to compress image' });
  }
};
