/**
 * Configurable physical photo dimensions and boundary validation.
 *
 * NOTE ON PRODUCT DEFAULTS:
 * No physical photo size (such as 35x45 mm or 50.8x50.8 mm) has been established
 * as the confirmed product default. The sample reference PDF has not yet been physically
 * measured. The provisional configuration below serves strictly as a temporary placeholder
 * that can be easily updated in one central location once physical measurements are verified.
 */

export const MIN_PHOTO_DIMENSION_MM = 15;
export const MAX_PHOTO_DIMENSION_MM = 150;

/**
 * Physical photo dimensions model.
 * All internal geometry and math operate on widthMm and heightMm.
 */
export interface PhotoDimensions {
  readonly widthMm: number;
  readonly heightMm: number;
  readonly unitPreference?: 'mm' | 'in';
}

/**
 * Result of validating photo dimensions against physical limits.
 */
export interface DimensionValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * PROVISIONAL DEFAULT CONFIGURATION:
 * This is an unconfirmed, temporary placeholder configuration.
 * It is NOT a confirmed product default and must not be presented as one.
 * Update this single constant once the reference sample's physical dimensions
 * have been measured with physical calipers/rulers.
 */
export const PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS: PhotoDimensions = Object.freeze({
  widthMm: 35,
  heightMm: 45,
  unitPreference: 'mm',
});

/**
 * Validates a PhotoDimensions object against physical bounds (15 mm to 150 mm).
 * Returns a structured validation result containing any error messages.
 */
export function validatePhotoDimensions(dimensions: PhotoDimensions): DimensionValidationResult {
  const errors: string[] = [];

  if (!dimensions || typeof dimensions !== 'object') {
    return { valid: false, errors: ['Photo dimensions must be an object.'] };
  }

  const { widthMm, heightMm } = dimensions;

  if (typeof widthMm !== 'number' || !Number.isFinite(widthMm)) {
    errors.push(`Width must be a finite number. Received: ${widthMm}`);
  } else if (widthMm < MIN_PHOTO_DIMENSION_MM) {
    errors.push(`Width (${widthMm} mm) cannot be less than ${MIN_PHOTO_DIMENSION_MM} mm.`);
  } else if (widthMm > MAX_PHOTO_DIMENSION_MM) {
    errors.push(`Width (${widthMm} mm) cannot exceed ${MAX_PHOTO_DIMENSION_MM} mm.`);
  }

  if (typeof heightMm !== 'number' || !Number.isFinite(heightMm)) {
    errors.push(`Height must be a finite number. Received: ${heightMm}`);
  } else if (heightMm < MIN_PHOTO_DIMENSION_MM) {
    errors.push(`Height (${heightMm} mm) cannot be less than ${MIN_PHOTO_DIMENSION_MM} mm.`);
  } else if (heightMm > MAX_PHOTO_DIMENSION_MM) {
    errors.push(`Height (${heightMm} mm) cannot exceed ${MAX_PHOTO_DIMENSION_MM} mm.`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Asserts that photo dimensions are valid, throwing RangeError or TypeError if invalid.
 */
export function assertValidPhotoDimensions(dimensions: PhotoDimensions): void {
  const result = validatePhotoDimensions(dimensions);
  if (!result.valid) {
    throw new RangeError(`Invalid photo dimensions: ${result.errors.join(' ')}`);
  }
}

/**
 * Calculates the aspect ratio (width / height) of given photo dimensions.
 * Throws an error if dimensions are invalid or non-positive.
 */
export function calculateAspectRatio(dimensions: PhotoDimensions): number {
  assertValidPhotoDimensions(dimensions);
  return dimensions.widthMm / dimensions.heightMm;
}
