import sharp from 'sharp';

export interface AnimationOptions {
  format?: 'webp' | 'mp4' | 'gif';
  pages?: number; // E.g., 1 to extract the first frame
  colors?: number; // Optional for gif (2-256)
  // For animations, we often want to convert them to webp for massive savings
}

export const processAnimationImage = async (buffer: Buffer, options: AnimationOptions): Promise<{ buffer: Buffer; format: string }> => {
  const formatToUse = options.format || 'webp';
  
  // If user requests a single page (e.g., pages: 1), we just extract the first frame and save as static webp/jpeg
  if (options.pages === 1) {
    const staticBuffer = await sharp(buffer, { page: 0 })
      .webp({ quality: 80 })
      .toBuffer();
    return { buffer: staticBuffer, format: 'webp' };
  }

  // Handle conversion to animated WebP or keep GIF
  let pipeline = sharp(buffer, { animated: true });

  if (formatToUse === 'webp') {
    // Convert to animated WebP (huge savings over GIF)
    pipeline = pipeline.webp({ effort: 4, quality: 80 });
    const optimizedBuffer = await pipeline.toBuffer();
    return { buffer: optimizedBuffer, format: 'webp' };
  } 
  
  if (formatToUse === 'gif') {
    // Re-compress GIF
    // sharp doesn't have great GIF compression by itself compared to gifsicle, but it supports 'colors'
    const colors = options.colors || 256;
    pipeline = pipeline.gif({ colors, effort: 4 });
    const optimizedBuffer = await pipeline.toBuffer();
    return { buffer: optimizedBuffer, format: 'gif' };
  }

  // Fallback to webp if mp4 or other requested (Sharp doesn't do mp4)
  // To do mp4 we would need ffmpeg. We'll fallback to animated webp for now.
  pipeline = pipeline.webp({ effort: 4, quality: 80 });
  const optimizedBuffer = await pipeline.toBuffer();
  return { buffer: optimizedBuffer, format: 'webp' };
};
