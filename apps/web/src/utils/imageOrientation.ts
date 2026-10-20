/**
 * EXIF Orientation Strategy & Normalization Guide for Passport Photo Studio.
 *
 * Browsers and EXIF Orientation:
 * 1. For HTML <img> previews (Phase 2A):
 *    Modern browsers (Chrome 81+, Firefox 26+, Safari 13.1+, Edge 81+) automatically orient
 *    standard <img> elements according to EXIF tags (CSS `image-orientation: from-image` by default).
 *
 * 2. For HTML5 Canvas operations (Phase 3 Interactive Cropping & Phase 5 Print Export):
 *    Direct `ctx.drawImage(img, ...)` in older WebViews or canvas pipelines may draw un-rotated pixels.
 *    To ensure complete physical accuracy across all platforms, canvas editing must use:
 *      `createImageBitmap(blob, { imageOrientation: 'from-image' })`
 *    which decodes the raw image data with EXIF orientation baked directly into the bitmap buffer.
 */

/**
 * Creates an ImageBitmap from an image Blob with EXIF orientation normalized upright.
 * Ready for Phase 3 interactive canvas operations.
 */
export async function createOrientedImageBitmap(blob: Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(blob, { imageOrientation: 'from-image' });
  }

  // Fallback for environments where createImageBitmap is unsupported
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to obtain 2D canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      createImageBitmap(canvas).then(resolve).catch(reject);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to decode image for canvas normalization'));
    };

    img.src = objectUrl;
  });
}
