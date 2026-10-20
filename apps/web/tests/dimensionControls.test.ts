import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDimensionValue,
  parseDimensionValue,
  validateDimensionInputs,
  formatAspectRatioDisplay,
} from '../src/utils/dimensionControls.ts';
import {
  MIN_PHOTO_DIMENSION_MM,
  MAX_PHOTO_DIMENSION_MM,
  PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS,
} from '@passport-photo/shared';

describe('Dimension Controls & Validation', () => {
  it('validates standard millimeter inputs within bounds', () => {
    const result = validateDimensionInputs('35', '45', 'mm');
    assert.equal(result.isValid, true);
    assert.equal(result.widthError, null);
    assert.equal(result.heightError, null);
    assert.equal(result.generalError, null);
    assert.ok(result.parsedDimensions);
    assert.equal(result.parsedDimensions?.widthMm, 35);
    assert.equal(result.parsedDimensions?.heightMm, 45);
    assert.equal(result.parsedDimensions?.unitPreference, 'mm');
    assert.ok(result.aspectRatio);
    assert.equal(Math.round(result.aspectRatio! * 100) / 100, 0.78);
  });

  it('validates standard inch inputs and converts to millimeters', () => {
    const result = validateDimensionInputs('2', '2', 'in');
    assert.equal(result.isValid, true);
    assert.ok(result.parsedDimensions);
    // 2 inches = exactly 50.8 mm
    assert.equal(result.parsedDimensions?.widthMm, 50.8);
    assert.equal(result.parsedDimensions?.heightMm, 50.8);
    assert.equal(result.parsedDimensions?.unitPreference, 'in');
    assert.equal(result.aspectRatio, 1);
  });

  it('rejects dimensions below minimum boundary (15 mm)', () => {
    const resultBelowMin = validateDimensionInputs('14', '45', 'mm');
    assert.equal(resultBelowMin.isValid, false);
    assert.ok(resultBelowMin.widthError);
    assert.ok(resultBelowMin.widthError?.includes(`${MIN_PHOTO_DIMENSION_MM} mm`));

    const resultHeightBelowMin = validateDimensionInputs('35', '10', 'mm');
    assert.equal(resultHeightBelowMin.isValid, false);
    assert.ok(resultHeightBelowMin.heightError);
    assert.ok(resultHeightBelowMin.heightError?.includes(`${MIN_PHOTO_DIMENSION_MM} mm`));
  });

  it('rejects dimensions exceeding maximum boundary (150 mm)', () => {
    const resultAboveMax = validateDimensionInputs('151', '45', 'mm');
    assert.equal(resultAboveMax.isValid, false);
    assert.ok(resultAboveMax.widthError);
    assert.ok(resultAboveMax.widthError?.includes(`${MAX_PHOTO_DIMENSION_MM} mm`));

    const resultHeightAboveMax = validateDimensionInputs('35', '160', 'mm');
    assert.equal(resultHeightAboveMax.isValid, false);
    assert.ok(resultHeightAboveMax.heightError);
    assert.ok(resultHeightAboveMax.heightError?.includes(`${MAX_PHOTO_DIMENSION_MM} mm`));
  });

  it('rejects non-numeric, negative, or empty dimension inputs', () => {
    assert.equal(validateDimensionInputs('', '45', 'mm').isValid, false);
    assert.equal(validateDimensionInputs('   ', '45', 'mm').isValid, false);
    assert.equal(validateDimensionInputs('abc', '45', 'mm').isValid, false);
    assert.equal(validateDimensionInputs('-35', '45', 'mm').isValid, false);
    assert.equal(validateDimensionInputs('0', '45', 'mm').isValid, false);
    assert.equal(validateDimensionInputs('Infinity', '45', 'mm').isValid, false);
  });

  it('preserves physical size without drift when roundtripping exact inches', () => {
    // 2 inches = 50.8 mm
    const formattedInches = formatDimensionValue(50.8, 'in');
    assert.equal(formattedInches, '2');

    const parsedMm = parseDimensionValue('2', 'in');
    assert.equal(parsedMm, 50.8);
  });

  it('preserves physical millimeter values when switching units', () => {
    const originalWidthMm = 35;
    const originalHeightMm = 45;

    // Convert to inches representation
    const widthInStr = formatDimensionValue(originalWidthMm, 'in');
    const heightInStr = formatDimensionValue(originalHeightMm, 'in');

    assert.equal(widthInStr, '1.38');
    assert.equal(heightInStr, '1.77');

    // Parse back from inches
    const roundtripWidthMm = parseDimensionValue(widthInStr, 'in');
    const roundtripHeightMm = parseDimensionValue(heightInStr, 'in');

    assert.ok(roundtripWidthMm !== null);
    assert.ok(roundtripHeightMm !== null);
    // Drift is under 0.1 mm due to 2 decimal place inch rounding
    assert.ok(Math.abs(roundtripWidthMm! - originalWidthMm) < 0.1);
    assert.ok(Math.abs(roundtripHeightMm! - originalHeightMm) < 0.1);
  });

  it('formats aspect ratio cleanly for portrait, square, and landscape', () => {
    assert.equal(formatAspectRatioDisplay(35, 45), '1 : 1.29 (Portrait)');
    assert.equal(formatAspectRatioDisplay(50.8, 50.8), '1 : 1 (Square)');
    assert.equal(formatAspectRatioDisplay(60, 40), '1.50 : 1 (Landscape)');
    assert.equal(formatAspectRatioDisplay(0, 45), 'N/A');
    assert.equal(formatAspectRatioDisplay(-35, 45), 'N/A');
  });

  it('adheres to provisional default dimensions from shared package', () => {
    assert.equal(PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS.widthMm, 35);
    assert.equal(PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS.heightMm, 45);
    assert.equal(PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS.unitPreference, 'mm');

    const result = validateDimensionInputs(
      PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS.widthMm.toString(),
      PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS.heightMm.toString(),
      'mm'
    );
    assert.equal(result.isValid, true);
  });
});
