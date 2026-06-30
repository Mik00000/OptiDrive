import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME, getS3ConfigForWorkspace } from '../config/s3';
import crypto from 'crypto';
import path from 'path';
import sharp from 'sharp';

import { processRasterImage, RasterOptions } from './compression/raster';
import { processVectorImage, VectorOptions } from './compression/vector';
import { processAnimationImage, AnimationOptions } from './compression/animation';

export interface CompressionResult {
  originalSize: number;
  optimizedSize: number;
  format: string;
  cdnUrl: string;
}

export interface CompressImageParams {
  buffer: Buffer;
  originalFilename: string;
  mimetype: string;
  workspaceId: string;
  options: {
    raster?: RasterOptions;
    vector?: VectorOptions;
    animation?: AnimationOptions;
  };
}

export const compressImage = async ({
  buffer,
  originalFilename,
  mimetype,
  workspaceId,
  options
}: CompressImageParams): Promise<CompressionResult> => {
  const { client, bucketName, publicUrl } = await getS3ConfigForWorkspace(workspaceId);
  const originalSize = buffer.length;
  let optimizedBuffer: Buffer;
  let finalFormat: string;

  // Route to the correct processing logic based on mimetype and metadata
  if (mimetype === 'image/svg+xml') {
    const result = processVectorImage(buffer, options.vector || {});
    optimizedBuffer = result.buffer;
    finalFormat = result.format;
  } else {
    // Detect if the image is animated (GIF, Animated WebP, Animated AVIF)
    const metadata = await sharp(buffer).metadata();
    const isAnimation = metadata.pages ? metadata.pages > 1 : mimetype === 'image/gif';

    if (isAnimation) {
      const result = await processAnimationImage(buffer, options.animation || {});
      optimizedBuffer = result.buffer;
      finalFormat = result.format;
    } else {
      // Treat everything else as raster (jpeg, png, static webp, static avif)
      const result = await processRasterImage(buffer, options.raster || {});
      optimizedBuffer = result.buffer;
      finalFormat = result.format;
    }
  }

  const optimizedSize = optimizedBuffer.length;
  
  // Generate a unique and safe filename to prevent path traversal
  const uniqueId = crypto.randomUUID();
  const ext = `.${finalFormat}`;
  const safeName = path.parse(originalFilename).name.replace(/[^\w\sа-яА-ЯіІїЇєЄґҐ-]/gi, '').replace(/\s+/g, '_') || 'image';
  const newFilename = `${safeName}-${uniqueId}${ext}`;
  const fileKey = `${workspaceId}/${newFilename}`;

  // Upload to Cloudflare R2
  const contentTypeMap: Record<string, string> = {
    'webp': 'image/webp',
    'avif': 'image/avif',
    'jpeg': 'image/jpeg',
    'jpg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
  };

  const uploadCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
    Body: optimizedBuffer,
    ContentType: contentTypeMap[finalFormat] || 'application/octet-stream',
    CacheControl: 'public, max-age=31536000',
  });

  await client.send(uploadCommand);

  // Construct CDN URL
  let cdnUrl = '';
  if (publicUrl) {
    cdnUrl = `${publicUrl}/${fileKey}`;
  } else {
    // Return the local proxy URL 
    const apiBase = process.env.API_URL || 'http://localhost:3001';
    cdnUrl = `${apiBase}/api/v1/media/${fileKey}`;
  }

  return {
    originalSize,
    optimizedSize,
    format: finalFormat,
    cdnUrl,
  };
};
