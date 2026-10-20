/**
 * Client-Side File Validation Utilities for Passport Photo Studio.
 *
 * Enforces file size limits, supported formats (JPG, PNG, WebP),
 * and pixel dimension thresholds without server dependencies.
 */

export interface FileLike {
  readonly name: string;
  readonly size: number;
  readonly type: string;
}

export interface FileValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export interface DimensionValidationResult {
  readonly valid: boolean;
  readonly isLowResolution: boolean;
  readonly message?: string;
}

/**
 * Maximum allowed image upload size: 25 Megabytes.
 * Easily adjusted here if necessary.
 */
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Minimum recommended pixel dimension for quality 300 DPI printing.
 */
export const MIN_RECOMMENDED_PIXELS = 300;

/**
 * Supported MIME types for uploaded photos.
 */
export const SUPPORTED_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

/**
 * Supported file extensions for user-friendly display.
 */
export const SUPPORTED_EXTENSIONS = Object.freeze(['.jpg', '.jpeg', '.png', '.webp']);

/**
 * Converts raw bytes into human-readable formatted string (KB or MB).
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validates an uploaded file's type, extension, and file size.
 */
export function validateImageFile(file: FileLike | null | undefined): FileValidationResult {
  const errors: string[] = [];

  if (!file || typeof file !== 'object') {
    return { valid: false, errors: ['Please select a valid image file.'] };
  }

  // File size validation
  if (file.size === 0) {
    errors.push('The selected file is empty (0 bytes). Please select a valid photo.');
  } else if (file.size > MAX_FILE_SIZE_BYTES) {
    const formattedMax = formatFileSize(MAX_FILE_SIZE_BYTES);
    const formattedActual = formatFileSize(file.size);
    errors.push(
      `File is too large (${formattedActual}). Maximum allowed size is ${formattedMax}.`
    );
  }

  // File type and extension validation
  const lowerName = (file.name || '').toLowerCase();
  const lowerType = (file.type || '').toLowerCase();

  const hasSupportedExt = SUPPORTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const hasSupportedType = SUPPORTED_MIME_TYPES.includes(lowerType);

  if (!hasSupportedExt && !hasSupportedType) {
    errors.push(
      `Unsupported format. Please select a JPG, JPEG, PNG, or WebP photo.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates decoded image pixel dimensions.
 */
export function validateImageDimensions(width: number, height: number): DimensionValidationResult {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return {
      valid: false,
      isLowResolution: false,
      message: 'Invalid image dimensions.',
    };
  }

  if (width < MIN_RECOMMENDED_PIXELS || height < MIN_RECOMMENDED_PIXELS) {
    return {
      valid: true,
      isLowResolution: true,
      message: `Resolution is low (${width} × ${height} px). Photos at least ${MIN_RECOMMENDED_PIXELS} × ${MIN_RECOMMENDED_PIXELS} px print with higher clarity.`,
    };
  }

  return {
    valid: true,
    isLowResolution: false,
  };
}

/**
 * Returns aspect orientation description for user display.
 */
export function getImageOrientationLabel(width: number, height: number): 'Portrait' | 'Landscape' | 'Square' {
  if (width === height) return 'Square';
  return height > width ? 'Portrait' : 'Landscape';
}
