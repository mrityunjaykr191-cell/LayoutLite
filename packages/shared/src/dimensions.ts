/**
 * Configurable physical photo dimensions and boundary validation.
 *
 * The default is a configurable starting point, not a country-specific compliance size.
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
 * Provisional default requested for everyday document photos.
 * Update this single constant to change the starting physical dimensions.
 */
export const PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS: PhotoDimensions = Object.freeze({
  widthMm: 25,
  heightMm: 30,
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
