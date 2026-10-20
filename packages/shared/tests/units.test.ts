import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mmToInches,
  inchesToMm,
  mmToPoints,
  pointsToMm,
  inchesToPoints,
  pointsToInches,
  mmToPixels,
  pixelsToMm,
  inchesToPixels,
  pixelsToInches,
  pointsToPixels,
  pixelsToPoints,
  MM_PER_INCH,
  POINTS_PER_INCH,
} from '../dist/units.js';

describe('Unit Conversions Module', () => {
  describe('Constants', () => {
    it('defines 1 inch as exactly 25.4 mm', () => {
      assert.equal(MM_PER_INCH, 25.4);
    });

    it('defines 1 inch as exactly 72 PostScript/PDF points', () => {
      assert.equal(POINTS_PER_INCH, 72);
    });
  });

  describe('Physical Conversions (mm <-> in <-> pt)', () => {
    it('converts mm to inches accurately', () => {
      assert.equal(mmToInches(25.4), 1);
      assert.equal(mmToInches(50.8), 2);
      assert.equal(mmToInches(0), 0);
    });

    it('converts inches to mm accurately', () => {
      assert.equal(inchesToMm(1), 25.4);
      assert.equal(inchesToMm(2), 50.8);
      assert.equal(inchesToMm(0), 0);
    });

    it('converts mm to points accurately', () => {
      // 25.4 mm = 1 inch = 72 points
      assert.equal(mmToPoints(25.4), 72);
      // 210 mm (A4 width) in points: 210 * 72 / 25.4 ~ 595.27559
      const a4WidthPt = mmToPoints(210);
      assert.ok(Math.abs(a4WidthPt - 595.27559) < 0.001);
    });

    it('converts points to mm accurately', () => {
      assert.equal(pointsToMm(72), 25.4);
      const a4WidthMm = pointsToMm(595.27559);
      assert.ok(Math.abs(a4WidthMm - 210) < 0.001);
    });

    it('converts inches to points accurately', () => {
      assert.equal(inchesToPoints(1), 72);
      assert.equal(inchesToPoints(2), 144);
    });

    it('converts points to inches accurately', () => {
      assert.equal(pointsToInches(72), 1);
      assert.equal(pointsToInches(144), 2);
    });

    it('supports roundtrip physical conversion without precision loss', () => {
      const originalMm = 35.5;
      const roundtripMm = pointsToMm(mmToPoints(originalMm));
      assert.ok(Math.abs(originalMm - roundtripMm) < 1e-10);

      const originalIn = 1.75;
      const roundtripIn = mmToInches(inchesToMm(originalIn));
      assert.ok(Math.abs(originalIn - roundtripIn) < 1e-10);
    });
  });

  describe('Pixel Conversions (Requiring Explicit DPI)', () => {
    it('converts inches to pixels at various standard DPI values', () => {
      assert.equal(inchesToPixels(1, 72), 72);
      assert.equal(inchesToPixels(1, 150), 150);
      assert.equal(inchesToPixels(1, 300), 300);
      assert.equal(inchesToPixels(1, 600), 600);
      assert.equal(inchesToPixels(2, 300), 600);
    });

    it('converts pixels to inches at various DPI values', () => {
      assert.equal(pixelsToInches(300, 300), 1);
      assert.equal(pixelsToInches(600, 300), 2);
      assert.equal(pixelsToInches(150, 150), 1);
    });

    it('converts mm to pixels at 300 DPI accurately', () => {
      // 25.4 mm = 1 inch = 300 pixels at 300 DPI
      assert.equal(mmToPixels(25.4, 300), 300);
      // 50.8 mm = 2 inches = 600 pixels at 300 DPI
      assert.equal(mmToPixels(50.8, 300), 600);
    });

    it('converts pixels to mm at 300 DPI accurately', () => {
      assert.equal(pixelsToMm(300, 300), 25.4);
      assert.equal(pixelsToMm(600, 300), 50.8);
    });

    it('converts points to pixels accurately', () => {
      // 72 pt = 1 inch -> at 300 DPI should be 300 px
      assert.equal(pointsToPixels(72, 300), 300);
      assert.equal(pixelsToPoints(300, 300), 72);
    });

    it('supports roundtrip pixel conversions', () => {
      const originalPx = 450;
      const roundtripPx = mmToPixels(pixelsToMm(originalPx, 300), 300);
      assert.ok(Math.abs(originalPx - roundtripPx) < 1e-10);
    });
  });

  describe('Input Validation & Error Handling', () => {
    it('throws TypeError for non-finite unit inputs (NaN, Infinity)', () => {
      assert.throws(() => mmToInches(NaN), /TypeError/);
      assert.throws(() => inchesToMm(Infinity), /TypeError/);
      assert.throws(() => mmToPoints(-Infinity), /TypeError/);
      assert.throws(() => pointsToMm('25.4' as unknown as number), /TypeError/);
    });

    it('throws RangeError for invalid DPI (zero, negative, non-finite)', () => {
      assert.throws(() => mmToPixels(25.4, 0), /RangeError/);
      assert.throws(() => mmToPixels(25.4, -300), /RangeError/);
      assert.throws(() => inchesToPixels(1, NaN), /TypeError/);
      assert.throws(() => pixelsToMm(300, -1), /RangeError/);
    });
  });
});
