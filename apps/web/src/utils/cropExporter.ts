import { PhotoDimensions, mmToPixels } from '@passport-photo/shared';
import {
  CropSettings,
  CropBoxRect,
  getRotatedDimensions,
  calculateSourceCropRect,
  calculateSourceCropFromBox,
} from './cropGeometry';
import { createOrientedImageBitmap } from './imageOrientation';

export interface CroppedPhotoResult {
  readonly blob: Blob;
  readonly objectUrl: string;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly photoDimensions: PhotoDimensions;
  readonly cropSettings: CropSettings;
  readonly cropBox?: CropBoxRect;
}

export interface CropExportOptions {
  readonly file: Blob;
  readonly cropSettings: CropSettings;
  readonly cropBoxWidth?: number;
  readonly cropBoxHeight?: number;
  readonly cropBox?: CropBoxRect;
  readonly imageBounds?: { left: number; top: number; width: number; height: number };
  readonly photoDimensions: PhotoDimensions;
  readonly targetDpi?: number;
}

/**
 * High-resolution canvas crop extraction with EXIF normalization and rotation.
 */
export async function exportCroppedPhoto(options: CropExportOptions): Promise<CroppedPhotoResult> {
  const {
    file,
    cropSettings,
    photoDimensions,
    targetDpi = 300,
  } = options;

  // 1. Decode image with EXIF orientation normalized upright
  const bitmap = await createOrientedImageBitmap(file);

  try {
    // 2. Check rotated image dimensions
    const rotated = getRotatedDimensions(bitmap.width, bitmap.height, cropSettings.rotation);

    // 3. Compute target canvas resolution based on 300 DPI physical dimensions
    const standardWidthPx = Math.round(mmToPixels(photoDimensions.widthMm, targetDpi));
    const standardHeightPx = Math.round(mmToPixels(photoDimensions.heightMm, targetDpi));

    // Ensure we preserve native resolution if source is higher than 300 DPI
    const aspect = photoDimensions.widthMm / photoDimensions.heightMm;
    const targetWidthPx = Math.max(standardWidthPx, 600);
    const targetHeightPx = Math.max(standardHeightPx, Math.round(targetWidthPx / aspect));

    // 4. Calculate source crop coordinates on the rotated image space
    const sourceRect =
      options.cropBox && options.imageBounds
        ? calculateSourceCropFromBox(
            options.cropBox,
            options.imageBounds,
            rotated.width,
            rotated.height
          )
        : calculateSourceCropRect(
            rotated.width,
            rotated.height,
            cropSettings.zoom,
            cropSettings.panX,
            cropSettings.panY,
            options.cropBoxWidth ?? (options.cropBox?.width ?? 300),
            options.cropBoxHeight ?? (options.cropBox?.height ?? 300)
          );

    // 5. Render onto offscreen canvas with rotation
    const canvas = document.createElement('canvas');
    canvas.width = targetWidthPx;
    canvas.height = targetHeightPx;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to create 2D canvas context for crop export.');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Temporary canvas for rotation if rotation is applied
    if (cropSettings.rotation !== 0) {
      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = rotated.width;
      rotCanvas.height = rotated.height;
      const rotCtx = rotCanvas.getContext('2d');

      if (!rotCtx) {
        throw new Error('Failed to create rotation canvas context.');
      }

      rotCtx.imageSmoothingEnabled = true;
      rotCtx.imageSmoothingQuality = 'high';

      // Apply 90-degree rotation transforms
      rotCtx.translate(rotated.width / 2, rotated.height / 2);
      rotCtx.rotate((cropSettings.rotation * Math.PI) / 180);
      rotCtx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);

      // Draw cropped slice from rotated canvas onto target canvas
      ctx.drawImage(
        rotCanvas,
        sourceRect.sx,
        sourceRect.sy,
        sourceRect.sWidth,
        sourceRect.sHeight,
        0,
        0,
        targetWidthPx,
        targetHeightPx
      );
    } else {
      // Direct draw from bitmap
      ctx.drawImage(
        bitmap,
        sourceRect.sx,
        sourceRect.sy,
        sourceRect.sWidth,
        sourceRect.sHeight,
        0,
        0,
        targetWidthPx,
        targetHeightPx
      );
    }

    // 6. Export high-quality JPEG blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to export canvas to JPEG blob.'));
        },
        'image/jpeg',
        0.95
      );
    });

    const objectUrl = URL.createObjectURL(blob);

    return {
      blob,
      objectUrl,
      widthPx: targetWidthPx,
      heightPx: targetHeightPx,
      photoDimensions,
      cropSettings: {
        ...cropSettings,
        ...(options.cropBox ? { cropBox: options.cropBox } : {}),
      },
      cropBox: options.cropBox,
    };
  } finally {
    // Bitmap cleanup
    if (typeof bitmap.close === 'function') {
      bitmap.close();
    }
  }
}
