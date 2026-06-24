import { optimize } from 'svgo';

export interface VectorOptions {
  sanitize?: boolean; // Always forced to true in service
  removeViewBox?: boolean;
  multipass?: boolean;
  floatPrecision?: number;
}

export const processVectorImage = (buffer: Buffer, options: VectorOptions): { buffer: Buffer; format: string } => {
  let svgString = buffer.toString('utf-8');

  // Hardcode regex to strip javascript: URIs from href or xlink:href as extra XSS protection
  svgString = svgString.replace(/(href|xlink:href)=["']javascript:[^"']*["']/gi, '$1="#"');

  const removeViewBox = options.removeViewBox || false;
  const multipass = options.multipass || false;
  const floatPrecision = options.floatPrecision !== undefined ? options.floatPrecision : 2;

  const result = optimize(svgString, {
    multipass,
    floatPrecision,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            removeViewBox: removeViewBox, // False by default, so it's not removed
          },
        },
      } as import('svgo').PluginConfig,
      // Additional sanitization
      {
        name: 'removeAttrs',
        params: {
          attrs: '(onclick|onmouseover|onmouseout|onmousedown|onmouseup|onmousemove|onload|onerror)',
        }
      }
    ],
  });

  if ('error' in result) {
    throw new Error(`SVGO Error: ${result.error}`);
  }

  return { buffer: Buffer.from(result.data), format: 'svg' };
};
