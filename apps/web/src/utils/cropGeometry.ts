/**
 * Pure Mathematical Crop Geometry Engine for Passport Photo Studio.
 *
 * Calculates aspect-ratio constrained crop windows, clamping boundaries,
 * zoom constraints, and 90-degree rotational geometry without DOM dependencies.
 */

export const MIN_ZOOM = 1.0;
export const MAX_ZOOM = 3.0;
export const ZOOM_STEP = 0.1;

export type RotationDegrees = 0 | 90 | 180 | 270;

export type CropHandleType = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';

export interface CropBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface CropSettings {
  readonly zoom: number;
  readonly panX: number; // Horizontal pan offset in pixels relative to center
  readonly panY: number; // Vertical pan offset in pixels relative to center
  readonly rotation: RotationDegrees;
  readonly cropBox?: CropBoxRect;
}

export interface RectDimensions {
  readonly width: number;
  readonly height: number;
}

export interface CropBoxRect {
  readonly width: number;
  readonly height: number;
  readonly x: number;
  readonly y: number;
}

export interface SourceCropRect {
  readonly sx: number;
  readonly sy: number;
  readonly sWidth: number;
  readonly sHeight: number;
}

/**
 * Returns clean initial crop settings centered with 1.0x zoom and 0deg rotation.
 */
export function createDefaultCropSettings(): CropSettings {
  return {
    zoom: 1.0,
    panX: 0,
    panY: 0,
    rotation: 0,
  };
}

/**
 * Rotates orientation by 90 degrees clockwise (0 -> 90 -> 180 -> 270 -> 0).
 */
export function rotate90DegreesClockwise(current: RotationDegrees): RotationDegrees {
  switch (current) {
    case 0:
      return 90;
    case 90:
      return 180;
    case 180:
      return 270;
    case 270:
      return 0;
  }
}

/**
 * Swaps dimensions if rotation is 90 or 270 degrees.
 */
export function getRotatedDimensions(
  width: number,
  height: number,
  rotation: RotationDegrees
): RectDimensions {
  if (rotation === 90 || rotation === 270) {
    return { width: height, height: width };
  }
  return { width, height };
}

/**
 * Calculates the centered crop box dimensions to fit inside the editor viewport container
 * while strictly adhering to the target physical aspect ratio.
 */
export function calculateCropBox(
  containerWidth: number,
  containerHeight: number,
  targetAspectRatio: number,
  padding: number = 24
): CropBoxRect {
  if (
    !Number.isFinite(containerWidth) ||
    !Number.isFinite(containerHeight) ||
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    !Number.isFinite(targetAspectRatio) ||
    targetAspectRatio <= 0
  ) {
    return { width: 0, height: 0, x: 0, y: 0 };
  }

  const usableWidth = Math.max(10, containerWidth - padding * 2);
  const usableHeight = Math.max(10, containerHeight - padding * 2);

  let width = usableWidth;
  let height = width / targetAspectRatio;

  if (height > usableHeight) {
    height = usableHeight;
    width = height * targetAspectRatio;
  }

  const x = (containerWidth - width) / 2;
  const y = (containerHeight - height) / 2;

  return { width, height, x, y };
}

/**
 * Calculates the base scale required for the image to completely cover the crop box at 1.0x zoom.
 */
export function calculateBaseFitScale(
  imageWidth: number,
  imageHeight: number,
  cropBoxWidth: number,
  cropBoxHeight: number
): number {
  if (imageWidth <= 0 || imageHeight <= 0 || cropBoxWidth <= 0 || cropBoxHeight <= 0) {
    return 1.0;
  }
  const scaleX = cropBoxWidth / imageWidth;
  const scaleY = cropBoxHeight / imageHeight;
  return Math.max(scaleX, scaleY);
}

/**
 * Clamps pan offsets so the image content completely covers the crop box area.
 */
export function clampPanOffset(
  panX: number,
  panY: number,
  zoom: number,
  imageWidth: number,
  imageHeight: number,
  cropBoxWidth: number,
  cropBoxHeight: number
): { panX: number; panY: number } {
  const baseScale = calculateBaseFitScale(imageWidth, imageHeight, cropBoxWidth, cropBoxHeight);
  const currentScale = baseScale * Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));

  const renderedWidth = imageWidth * currentScale;
  const renderedHeight = imageHeight * currentScale;

  const maxPanX = Math.max(0, (renderedWidth - cropBoxWidth) / 2);
  const maxPanY = Math.max(0, (renderedHeight - cropBoxHeight) / 2);

  const clampedX = Math.max(-maxPanX, Math.min(maxPanX, panX));
  const clampedY = Math.max(-maxPanY, Math.min(maxPanY, panY));

  return {
    panX: Number.isFinite(clampedX) ? (clampedX === 0 ? 0 : clampedX) : 0,
    panY: Number.isFinite(clampedY) ? (clampedY === 0 ? 0 : clampedY) : 0,
  };
}

/**
 * Calculates source rectangle coordinates on the oriented image for canvas extraction.
 */
export function calculateSourceCropRect(
  imageWidth: number,
  imageHeight: number,
  zoom: number,
  panX: number,
  panY: number,
  cropBoxWidth: number,
  cropBoxHeight: number
): SourceCropRect {
  const baseScale = calculateBaseFitScale(imageWidth, imageHeight, cropBoxWidth, cropBoxHeight);
  const totalScale = baseScale * zoom;

  // Size of crop box in source image pixel units
  const sWidth = cropBoxWidth / totalScale;
  const sHeight = cropBoxHeight / totalScale;

  // Center of image in source units minus pan offset converted to source units
  const centerX = imageWidth / 2 - panX / totalScale;
  const centerY = imageHeight / 2 - panY / totalScale;

  const sx = centerX - sWidth / 2;
  const sy = centerY - sHeight / 2;

  return {
    sx: Math.max(0, Math.min(imageWidth - sWidth, sx)),
    sy: Math.max(0, Math.min(imageHeight - sHeight, sy)),
    sWidth: Math.min(imageWidth, sWidth),
    sHeight: Math.min(imageHeight, sHeight),
  };
}

/**
 * Moves a crop box by (deltaX, deltaY) while keeping it strictly within bounds.
 */
export function moveCropBox(
  currentBox: CropBoxRect,
  deltaX: number,
  deltaY: number,
  bounds: CropBounds
): CropBoxRect {
  const minX = bounds.minX;
  const maxX = Math.max(minX, bounds.maxX - currentBox.width);
  const minY = bounds.minY;
  const maxY = Math.max(minY, bounds.maxY - currentBox.height);

  const rawX = currentBox.x + deltaX;
  const rawY = currentBox.y + deltaY;

  const clampedX = Math.max(minX, Math.min(maxX, rawX));
  const clampedY = Math.max(minY, Math.min(maxY, rawY));

  return {
    x: Number.isFinite(clampedX) ? (clampedX === 0 ? 0 : clampedX) : minX,
    y: Number.isFinite(clampedY) ? (clampedY === 0 ? 0 : clampedY) : minY,
    width: currentBox.width,
    height: currentBox.height,
  };
}

/**
 * Resizes a crop box from a specific handle while strictly preserving the target aspect ratio
 * and clamping to the provided bounding box.
 */
export function resizeCropBoxWithHandle(
  currentBox: CropBoxRect,
  handle: CropHandleType,
  deltaX: number,
  deltaY: number,
  targetAspectRatio: number,
  bounds: CropBounds,
  minWidth: number = 40
): CropBoxRect {
  if (targetAspectRatio <= 0 || !Number.isFinite(targetAspectRatio)) {
    return currentBox;
  }

  const minW = Math.max(20, minWidth);
  const minH = minW / targetAspectRatio;

  switch (handle) {
    case 'se': {
      const anchorX = currentBox.x;
      const anchorY = currentBox.y;
      const maxW_x = Math.max(0, bounds.maxX - anchorX);
      const maxH_y = Math.max(0, bounds.maxY - anchorY);
      const maxAllowedW = Math.max(minW, Math.min(maxW_x, maxH_y * targetAspectRatio));

      const delta =
        Math.abs(deltaX) > Math.abs(deltaY * targetAspectRatio)
          ? deltaX
          : deltaY * targetAspectRatio;
      const newW = currentBox.width + delta;
      const clampedW = Math.max(minW, Math.min(maxAllowedW, newW));
      const clampedH = clampedW / targetAspectRatio;

      return { x: anchorX, y: anchorY, width: clampedW, height: clampedH };
    }

    case 'nw': {
      const anchorX = currentBox.x + currentBox.width;
      const anchorY = currentBox.y + currentBox.height;
      const maxW_x = Math.max(0, anchorX - bounds.minX);
      const maxH_y = Math.max(0, anchorY - bounds.minY);
      const maxAllowedW = Math.max(minW, Math.min(maxW_x, maxH_y * targetAspectRatio));

      const delta =
        Math.abs(deltaX) > Math.abs(deltaY * targetAspectRatio)
          ? -deltaX
          : -deltaY * targetAspectRatio;
      const newW = currentBox.width + delta;
      const clampedW = Math.max(minW, Math.min(maxAllowedW, newW));
      const clampedH = clampedW / targetAspectRatio;

      return {
        x: anchorX - clampedW,
        y: anchorY - clampedH,
        width: clampedW,
        height: clampedH,
      };
    }

    case 'ne': {
      const anchorX = currentBox.x;
      const anchorY = currentBox.y + currentBox.height;
      const maxW_x = Math.max(0, bounds.maxX - anchorX);
      const maxH_y = Math.max(0, anchorY - bounds.minY);
      const maxAllowedW = Math.max(minW, Math.min(maxW_x, maxH_y * targetAspectRatio));

      const delta =
        Math.abs(deltaX) > Math.abs(deltaY * targetAspectRatio)
          ? deltaX
          : -deltaY * targetAspectRatio;
      const newW = currentBox.width + delta;
      const clampedW = Math.max(minW, Math.min(maxAllowedW, newW));
      const clampedH = clampedW / targetAspectRatio;

      return {
        x: anchorX,
        y: anchorY - clampedH,
        width: clampedW,
        height: clampedH,
      };
    }

    case 'sw': {
      const anchorX = currentBox.x + currentBox.width;
      const anchorY = currentBox.y;
      const maxW_x = Math.max(0, anchorX - bounds.minX);
      const maxH_y = Math.max(0, bounds.maxY - anchorY);
      const maxAllowedW = Math.max(minW, Math.min(maxW_x, maxH_y * targetAspectRatio));

      const delta =
        Math.abs(deltaX) > Math.abs(deltaY * targetAspectRatio)
          ? -deltaX
          : deltaY * targetAspectRatio;
      const newW = currentBox.width + delta;
      const clampedW = Math.max(minW, Math.min(maxAllowedW, newW));
      const clampedH = clampedW / targetAspectRatio;

      return {
        x: anchorX - clampedW,
        y: anchorY,
        width: clampedW,
        height: clampedH,
      };
    }

    case 'e': {
      const anchorX = currentBox.x;
      const centerY = currentBox.y + currentBox.height / 2;
      const maxW_x = Math.max(0, bounds.maxX - anchorX);
      const maxHalfH = Math.max(0, Math.min(centerY - bounds.minY, bounds.maxY - centerY));
      const maxAllowedW = Math.max(minW, Math.min(maxW_x, maxHalfH * 2 * targetAspectRatio));

      const newW = currentBox.width + deltaX;
      const clampedW = Math.max(minW, Math.min(maxAllowedW, newW));
      const clampedH = clampedW / targetAspectRatio;
      const newY = centerY - clampedH / 2;

      return { x: anchorX, y: newY, width: clampedW, height: clampedH };
    }

    case 'w': {
      const anchorX = currentBox.x + currentBox.width;
      const centerY = currentBox.y + currentBox.height / 2;
      const maxW_x = Math.max(0, anchorX - bounds.minX);
      const maxHalfH = Math.max(0, Math.min(centerY - bounds.minY, bounds.maxY - centerY));
      const maxAllowedW = Math.max(minW, Math.min(maxW_x, maxHalfH * 2 * targetAspectRatio));

      const newW = currentBox.width - deltaX;
      const clampedW = Math.max(minW, Math.min(maxAllowedW, newW));
      const clampedH = clampedW / targetAspectRatio;
      const newY = centerY - clampedH / 2;

      return { x: anchorX - clampedW, y: newY, width: clampedW, height: clampedH };
    }

    case 's': {
      const anchorY = currentBox.y;
      const centerX = currentBox.x + currentBox.width / 2;
      const maxH_y = Math.max(0, bounds.maxY - anchorY);
      const maxHalfW = Math.max(0, Math.min(centerX - bounds.minX, bounds.maxX - centerX));
      const maxAllowedH = Math.max(minH, Math.min(maxH_y, (maxHalfW * 2) / targetAspectRatio));

      const newH = currentBox.height + deltaY;
      const clampedH = Math.max(minH, Math.min(maxAllowedH, newH));
      const clampedW = clampedH * targetAspectRatio;
      const newX = centerX - clampedW / 2;

      return { x: newX, y: anchorY, width: clampedW, height: clampedH };
    }

    case 'n': {
      const anchorY = currentBox.y + currentBox.height;
      const centerX = currentBox.x + currentBox.width / 2;
      const maxH_y = Math.max(0, anchorY - bounds.minY);
      const maxHalfW = Math.max(0, Math.min(centerX - bounds.minX, bounds.maxX - centerX));
      const maxAllowedH = Math.max(minH, Math.min(maxH_y, (maxHalfW * 2) / targetAspectRatio));

      const newH = currentBox.height - deltaY;
      const clampedH = Math.max(minH, Math.min(maxAllowedH, newH));
      const clampedW = clampedH * targetAspectRatio;
      const newX = centerX - clampedW / 2;

      return { x: newX, y: anchorY - clampedH, width: clampedW, height: clampedH };
    }
  }
}

/**
 * Clamps a crop box to lie completely within the given bounds, reducing size if necessary
 * while preserving aspect ratio.
 */
export function clampCropBoxToBounds(
  box: CropBoxRect,
  bounds: CropBounds,
  targetAspectRatio: number
): CropBoxRect {
  const maxW = Math.max(0, bounds.maxX - bounds.minX);
  const maxH = Math.max(0, bounds.maxY - bounds.minY);
  const maxFitW = Math.min(maxW, maxH * targetAspectRatio);

  const clampedW = Math.max(20, Math.min(maxFitW, box.width));
  const clampedH = clampedW / targetAspectRatio;

  const minX = bounds.minX;
  const maxX = Math.max(minX, bounds.maxX - clampedW);
  const minY = bounds.minY;
  const maxY = Math.max(minY, bounds.maxY - clampedH);

  const clampedX = Math.max(minX, Math.min(maxX, box.x));
  const clampedY = Math.max(minY, Math.min(maxY, box.y));

  return {
    x: Number.isFinite(clampedX) ? (clampedX === 0 ? 0 : clampedX) : minX,
    y: Number.isFinite(clampedY) ? (clampedY === 0 ? 0 : clampedY) : minY,
    width: clampedW,
    height: clampedH,
  };
}

/**
 * Calculates the exact source crop rectangle on the rotated source image
 * from an on-screen crop box and the rendered image boundaries.
 */
export function calculateSourceCropFromBox(
  cropBox: CropBoxRect,
  imageBounds: { left: number; top: number; width: number; height: number },
  sourceRotatedWidth: number,
  sourceRotatedHeight: number
): SourceCropRect {
  const scale = imageBounds.width / sourceRotatedWidth;
  if (scale <= 0 || !Number.isFinite(scale)) {
    return { sx: 0, sy: 0, sWidth: sourceRotatedWidth, sHeight: sourceRotatedHeight };
  }

  const relX = cropBox.x - imageBounds.left;
  const relY = cropBox.y - imageBounds.top;

  const sx = Math.max(0, Math.min(sourceRotatedWidth, relX / scale));
  const sy = Math.max(0, Math.min(sourceRotatedHeight, relY / scale));
  const sWidth = Math.max(1, Math.min(sourceRotatedWidth - sx, cropBox.width / scale));
  const sHeight = Math.max(1, Math.min(sourceRotatedHeight - sy, cropBox.height / scale));

  return {
    sx: sx === 0 ? 0 : sx,
    sy: sy === 0 ? 0 : sy,
    sWidth,
    sHeight,
  };
}

