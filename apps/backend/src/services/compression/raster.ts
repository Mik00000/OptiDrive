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

  // Metadata & Color Space Preservation
  if (options.stripMetadata === false) {
    pipeline = pipeline.withMetadata();
  } else {
    // Strip EXIF metadata for privacy/size, but preserve the ICC Profile 
    // to prevent colors from shifting or looking washed out.
    pipeline = pipeline.keepMetadata().keepIccProfile();
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
      pipeline = pipeline.avif({ 
        quality, 
        effort, 
        lossless,
        chromaSubsampling: '4:2:0' // Reduces file size by ~15-20% with virtually no visual loss
      });
      break;
    case 'webp':
      pipeline = pipeline.webp({ 
        quality, 
        effort, 
        lossless,
        smartSubsample: true // Better edge quality and prevents color bleeding
      });
      break;
    case 'jpeg':
      // Mozjpeg offers superior quantization; progressive loading yields faster page loads
      pipeline = pipeline.jpeg({ 
        quality, 
        mozjpeg: true,
        progressive: true
      });
      break;
    case 'png':
      pipeline = pipeline.png({ 
        quality, 
        effort, 
        compressionLevel: 9, 
        adaptiveFiltering: true,
        palette: true // Reduces PNG sizes by up to 70% for images with few colors
      });
      break;
  }

  const optimizedBuffer = await pipeline.toBuffer();
  return { buffer: optimizedBuffer, format: formatToUse };
};
