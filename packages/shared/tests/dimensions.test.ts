import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePhotoDimensions,
  assertValidPhotoDimensions,
  calculateAspectRatio,
  MIN_PHOTO_DIMENSION_MM,
  MAX_PHOTO_DIMENSION_MM,
  PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS,
  type PhotoDimensions,
} from '../dist/dimensions.js';

/**
 * EXPLICIT TEST FIXTURES:
 * These fixtures are strictly for automated unit tests and must not be confused with
 * confirmed product defaults.
 */
const TEST_FIXTURE_PHOTO_SIZE: PhotoDimensions = Object.freeze({
  widthMm: 35,
  heightMm: 45,
  unitPreference: 'mm',
});

const TEST_FIXTURE_SQUARE_PHOTO_SIZE: PhotoDimensions = Object.freeze({
  widthMm: 50,
  heightMm: 50,
  unitPreference: 'mm',
});

const TEST_FIXTURE_LARGE_PHOTO_SIZE: PhotoDimensions = Object.freeze({
  widthMm: 100,
  heightMm: 120,
  unitPreference: 'mm',
});

describe('Photo Dimensions Module', () => {
  describe('Boundary Limits Constants', () => {
    it('defines correct minimum and maximum physical boundaries', () => {
      assert.equal(MIN_PHOTO_DIMENSION_MM, 15);
      assert.equal(MAX_PHOTO_DIMENSION_MM, 150);
    });
  });

  describe('Validation at Boundaries', () => {
    it('accepts exact lower bound (15 mm)', () => {
      const result = validatePhotoDimensions({ widthMm: 15, heightMm: 15 });
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    it('accepts exact upper bound (150 mm)', () => {
      const result = validatePhotoDimensions({ widthMm: 150, heightMm: 150 });
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    it('rejects dimensions below lower bound (14.99 mm)', () => {
      const result = validatePhotoDimensions({ widthMm: 14.99, heightMm: 45 });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('cannot be less than 15 mm')));
    });

    it('rejects dimensions above upper bound (150.01 mm)', () => {
      const result = validatePhotoDimensions({ widthMm: 35, heightMm: 150.01 });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('cannot exceed 150 mm')));
    });

    it('rejects non-numeric and non-finite dimensions', () => {
      assert.equal(validatePhotoDimensions({ widthMm: NaN, heightMm: 45 }).valid, false);
      assert.equal(validatePhotoDimensions({ widthMm: 35, heightMm: Infinity }).valid, false);
      assert.equal(validatePhotoDimensions({ widthMm: -10, heightMm: 45 }).valid, false);
    });

    it('assertValidPhotoDimensions throws RangeError on invalid dimensions', () => {
      assert.throws(
        () => assertValidPhotoDimensions({ widthMm: 10, heightMm: 45 }),
        /RangeError/
      );
    });
  });

  describe('Aspect Ratio Calculation', () => {
    it('calculates aspect ratio for standard test fixture', () => {
      const ratio = calculateAspectRatio(TEST_FIXTURE_PHOTO_SIZE);
      // 35 / 45 = 7 / 9 ~ 0.7777777777777778
      assert.ok(Math.abs(ratio - (35 / 45)) < 1e-10);
    });

    it('calculates aspect ratio 1.0 for square fixture', () => {
      const ratio = calculateAspectRatio(TEST_FIXTURE_SQUARE_PHOTO_SIZE);
      assert.equal(ratio, 1.0);
    });

    it('calculates aspect ratio for large fixture', () => {
      const ratio = calculateAspectRatio(TEST_FIXTURE_LARGE_PHOTO_SIZE);
      assert.ok(Math.abs(ratio - (100 / 120)) < 1e-10);
    });

    it('throws RangeError when calculating aspect ratio of out-of-bounds dimensions', () => {
      assert.throws(
        () => calculateAspectRatio({ widthMm: 5, heightMm: 45 }),
        /RangeError/
      );
    });
  });

  describe('Provisional Default Configuration', () => {
    it('provides a valid provisional default that passes validation', () => {
      const result = validatePhotoDimensions(PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS);
      assert.equal(result.valid, true);
      assert.ok(PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS.widthMm >= MIN_PHOTO_DIMENSION_MM);
      assert.ok(PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS.heightMm <= MAX_PHOTO_DIMENSION_MM);
    });

    it('is frozen to prevent runtime mutation', () => {
      assert.ok(Object.isFrozen(PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS));
    });
  });
});
