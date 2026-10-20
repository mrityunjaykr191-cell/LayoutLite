/**
 * Dimension controls utility for Passport Photo Studio.
 * Interfaces with @passport-photo/shared for physical unit conversions and boundary validations.
 */

import {
  type PhotoDimensions,
  validatePhotoDimensions,
  calculateAspectRatio,
  mmToInches,
  inchesToMm,
  MIN_PHOTO_DIMENSION_MM,
  MAX_PHOTO_DIMENSION_MM,
} from '@passport-photo/shared';

export type DimensionUnit = 'mm' | 'in';

export interface DimensionInputState {
  readonly widthInput: string;
  readonly heightInput: string;
  readonly unit: DimensionUnit;
}

export interface DimensionValidationState {
  readonly isValid: boolean;
  readonly widthError: string | null;
  readonly heightError: string | null;
  readonly generalError: string | null;
  readonly parsedDimensions: PhotoDimensions | null;
  readonly aspectRatio: number | null;
}

/**
 * Format a millimeter dimension value for display in the chosen unit.
 */
export function formatDimensionValue(valueMm: number, unit: DimensionUnit): string {
  if (!Number.isFinite(valueMm)) return '';
  if (unit === 'in') {
    const inches = mmToInches(valueMm);
    // Format to 2 decimal places, trimming trailing zeros
    const formatted = inches.toFixed(2);
    return formatted.replace(/\.?0+$/, (match) => (match.startsWith('.') && match.length === 3 ? '' : match));
  }
  // Millimeters: format to 1 decimal place if fractional, otherwise integer
  const rounded = Math.round(valueMm * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
}

/**
 * Parses user text input in the specified unit into a finite millimeter number.
 * Returns null if the input string cannot be parsed into a positive finite number.
 */
export function parseDimensionValue(input: string, unit: DimensionUnit): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  if (unit === 'in') {
    return inchesToMm(parsed);
  }
  return parsed;
}

/**
 * Validates raw dimension string inputs and returns structured validation state.
 */
export function validateDimensionInputs(
  widthInput: string,
  heightInput: string,
  unit: DimensionUnit
): DimensionValidationState {
  let widthError: string | null = null;
  let heightError: string | null = null;
  let generalError: string | null = null;

  const minInches = mmToInches(MIN_PHOTO_DIMENSION_MM).toFixed(2);
  const maxInches = mmToInches(MAX_PHOTO_DIMENSION_MM).toFixed(2);
  const boundsNotice =
    unit === 'mm'
      ? `${MIN_PHOTO_DIMENSION_MM} mm – ${MAX_PHOTO_DIMENSION_MM} mm`
      : `${minInches} in – ${maxInches} in (${MIN_PHOTO_DIMENSION_MM} mm – ${MAX_PHOTO_DIMENSION_MM} mm)`;

  const parsedWidthMm = parseDimensionValue(widthInput, unit);
  const parsedHeightMm = parseDimensionValue(heightInput, unit);

  if (parsedWidthMm === null) {
    widthError = `Please enter a valid positive width in ${unit}.`;
  } else if (parsedWidthMm < MIN_PHOTO_DIMENSION_MM) {
    widthError = `Width cannot be less than ${boundsNotice.split(' – ')[0]}.`;
  } else if (parsedWidthMm > MAX_PHOTO_DIMENSION_MM) {
    widthError = `Width cannot exceed ${boundsNotice.split(' – ')[1]}.`;
  }

  if (parsedHeightMm === null) {
    heightError = `Please enter a valid positive height in ${unit}.`;
  } else if (parsedHeightMm < MIN_PHOTO_DIMENSION_MM) {
    heightError = `Height cannot be less than ${boundsNotice.split(' – ')[0]}.`;
  } else if (parsedHeightMm > MAX_PHOTO_DIMENSION_MM) {
    heightError = `Height cannot exceed ${boundsNotice.split(' – ')[1]}.`;
  }

  if (widthError || heightError || parsedWidthMm === null || parsedHeightMm === null) {
    return {
      isValid: false,
      widthError,
      heightError,
      generalError,
      parsedDimensions: null,
      aspectRatio: null,
    };
  }

  const candidateDimensions: PhotoDimensions = {
    widthMm: parsedWidthMm,
    heightMm: parsedHeightMm,
    unitPreference: unit,
  };

  const sharedValidation = validatePhotoDimensions(candidateDimensions);
  if (!sharedValidation.valid) {
    return {
      isValid: false,
      widthError: null,
      heightError: null,
      generalError: sharedValidation.errors.join(' '),
      parsedDimensions: null,
      aspectRatio: null,
    };
  }

  const aspectRatio = calculateAspectRatio(candidateDimensions);

  return {
    isValid: true,
    widthError: null,
    heightError: null,
    generalError: null,
    parsedDimensions: candidateDimensions,
    aspectRatio,
  };
}

/**
 * Formats aspect ratio for human-readable display (e.g. "1 : 1.29" or "35 : 45 (0.78)").
 */
export function formatAspectRatioDisplay(widthMm: number, heightMm: number): string {
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm) || widthMm <= 0 || heightMm <= 0) {
    return 'N/A';
  }

  const ratio = widthMm / heightMm;

  // Check for common clean ratios
  if (Math.abs(ratio - 1.0) < 0.005) {
    return '1 : 1 (Square)';
  }

  const decimalRatio = ratio.toFixed(2);
  const inverseDecimal = (1 / ratio).toFixed(2);

  if (ratio < 1) {
    return `1 : ${inverseDecimal} (Portrait)`;
  }
  return `${decimalRatio} : 1 (Landscape)`;
}
