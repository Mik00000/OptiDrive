import sharp from 'sharp';

export interface RasterOptions {
  format?: 'avif' | 'webp' | 'jpeg' | 'png' | 'auto';
  quality?: number;
  lossless?: boolean;
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'inside';
  stripMetadata?: boolean;
  effort?: number;
  // autoFormat is resolved before passing to this function
  resolvedFormat?: 'avif' | 'webp' | 'jpeg' | 'png';
}

export const processRasterImage = async (buffer: Buffer, options: RasterOptions): Promise<{ buffer: Buffer; format: string }> => {
  let pipeline = sharp(buffer);

  // Metadata
  if (options.stripMetadata === false) {
    pipeline = pipeline.withMetadata();
  }

  // Resize
  if (options.width || options.height) {
    pipeline = pipeline.resize({
      width: options.width,
      height: options.height,
      fit: options.fit || 'cover',
      withoutEnlargement: true, // Don't upscale smaller images
    });
  }

  // Formatting
  const formatToUse = options.resolvedFormat || 'webp'; // fallback to webp
  const quality = options.quality || 80;
  const effort = options.effort !== undefined ? options.effort : 4;
  const lossless = options.lossless || false;

  switch (formatToUse) {
    case 'avif':
      pipeline = pipeline.avif({ quality, effort, lossless });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality, effort, lossless });
      break;
    case 'jpeg':
      // JPEG doesn't support lossless or effort in the same way, but mozjpeg offers great compression
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case 'png':
      pipeline = pipeline.png({ quality, effort, compressionLevel: 9, adaptiveFiltering: true });
      break;
  }

  const optimizedBuffer = await pipeline.toBuffer();
  return { buffer: optimizedBuffer, format: formatToUse };
};
