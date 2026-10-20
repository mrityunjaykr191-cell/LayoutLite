import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSingleRowLayout,
  calculateMultiRowGridLayout,
  calculateCutGuides,
  validateSheetDimensions,
  validatePageMargins,
  validateLayoutGaps,
  validateSheetLayoutSettings,
  calculateSheetLayout,
  A4_SHEET_DIMENSIONS_MM,
  DEFAULT_PAGE_MARGINS_MM,
  DEFAULT_LAYOUT_GAPS_MM,
  DEFAULT_LAYOUT_SETTINGS,
} from '../dist/layout.js';
import type { PhotoDimensions } from '../dist/dimensions.js';
import type { PageMargins, LayoutGaps } from '../dist/layout.js';

/**
 * EXPLICIT TEST FIXTURES:
 * Specifically created for unit tests. Not confirmed product defaults.
 */
const TEST_FIXTURE_PHOTO_SIZE: PhotoDimensions = Object.freeze({
  widthMm: 35,
  heightMm: 45,
  unitPreference: 'mm',
});

const TEST_FIXTURE_NARROW_PHOTO_SIZE: PhotoDimensions = Object.freeze({
  widthMm: 25,
  heightMm: 35,
  unitPreference: 'mm',
});

const TEST_FIXTURE_WIDE_PHOTO_SIZE: PhotoDimensions = Object.freeze({
  widthMm: 50,
  heightMm: 50,
  unitPreference: 'mm',
});

const TEST_FIXTURE_US_LETTER = Object.freeze({
  widthMm: 215.9,
  heightMm: 279.4,
});

describe('A4 Layout Geometry Engine', () => {
  describe('A4 Constants & Sheet Validation', () => {
    it('defines standard A4 page dimensions (210 x 297 mm)', () => {
      assert.equal(A4_SHEET_DIMENSIONS_MM.widthMm, 210);
      assert.equal(A4_SHEET_DIMENSIONS_MM.heightMm, 297);
    });

    it('validates standard A4 dimensions successfully', () => {
      const result = validateSheetDimensions(A4_SHEET_DIMENSIONS_MM);
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    it('rejects non-object sheet dimensions', () => {
      const resNull = validateSheetDimensions(null as unknown as { widthMm: number; heightMm: number });
      assert.equal(resNull.valid, false);
      assert.ok(resNull.errors.some((e) => e.includes('must be an object')));

      const resPrim = validateSheetDimensions('A4' as unknown as { widthMm: number; heightMm: number });
      assert.equal(resPrim.valid, false);
    });

    it('rejects sheet dimensions with NaN, Infinity, zero, or negative numbers', () => {
      const resNaN = validateSheetDimensions({ widthMm: NaN, heightMm: 297 });
      assert.equal(resNaN.valid, false);
      assert.ok(resNaN.errors.some((e) => e.includes('Sheet width must be a positive finite number')));

      const resInf = validateSheetDimensions({ widthMm: 210, heightMm: Infinity });
      assert.equal(resInf.valid, false);
      assert.ok(resInf.errors.some((e) => e.includes('Sheet height must be a positive finite number')));

      const resZero = validateSheetDimensions({ widthMm: 0, heightMm: 297 });
      assert.equal(resZero.valid, false);
      assert.ok(resZero.errors.some((e) => e.includes('Sheet width must be a positive finite number')));

      const resNeg = validateSheetDimensions({ widthMm: 210, heightMm: -297 });
      assert.equal(resNeg.valid, false);
      assert.ok(resNeg.errors.some((e) => e.includes('Sheet height must be a positive finite number')));
    });
  });

  describe('Cut-Guide Coordinate Calculation', () => {
    it('calculates 4 corner ticks with correct millimeter and point coordinates', () => {
      const guides = calculateCutGuides(10, 20, 35, 45, 3);

      // Top-Left corner ticks extending outward:
      // Horizontal tick: x from 10-3=7 to 10, y=20
      assert.equal(guides.topLeft.horizontal.x1Mm, 7);
      assert.equal(guides.topLeft.horizontal.y1Mm, 20);
      assert.equal(guides.topLeft.horizontal.x2Mm, 10);
      assert.equal(guides.topLeft.horizontal.y2Mm, 20);

      // Vertical tick: x=10, y from 20-3=17 to 20
      assert.equal(guides.topLeft.vertical.x1Mm, 10);
      assert.equal(guides.topLeft.vertical.y1Mm, 17);
      assert.equal(guides.topLeft.vertical.x2Mm, 10);
      assert.equal(guides.topLeft.vertical.y2Mm, 20);

      // Top-Right corner ticks:
      // Horizontal tick: x from 10+35=45 to 45+3=48, y=20
      assert.equal(guides.topRight.horizontal.x1Mm, 45);
      assert.equal(guides.topRight.horizontal.y1Mm, 20);
      assert.equal(guides.topRight.horizontal.x2Mm, 48);
      assert.equal(guides.topRight.horizontal.y2Mm, 20);

      // Bottom-Right corner ticks:
      // Horizontal: x from 45 to 48, y=20+45=65
      assert.equal(guides.bottomRight.horizontal.x1Mm, 45);
      assert.equal(guides.bottomRight.horizontal.y1Mm, 65);
      assert.equal(guides.bottomRight.horizontal.x2Mm, 48);
      assert.equal(guides.bottomRight.horizontal.y2Mm, 65);

      // Verify points conversion matches points ratio (72 / 25.4)
      assert.ok(Math.abs(guides.topLeft.horizontal.x2Pt - (10 * 72 / 25.4)) < 0.001);
    });
  });

  describe('Configurable Single-Row Layout', () => {
    it('calculates a valid single-row layout that fits and is centered horizontally', () => {
      // 4 copies of 35mm photos, 5mm spacing, 10mm min side margin on 210mm sheet
      // Usable width = 210 - 20 = 190mm
      // Required width = 4 * 35 + 3 * 5 = 140 + 15 = 155mm <= 190mm -> Fits!
      // Expected left margin = (210 - 155) / 2 = 27.5mm
      const result = calculateSingleRowLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 4,
        topMarginMm: 15,
        minSideMarginMm: 10,
        spacingMm: 5,
      });

      assert.equal(result.fits, true);
      assert.equal(result.copyCount, 4);
      assert.equal(result.requiredWidthMm, 155);
      assert.equal(result.availableWidthMm, 190);
      assert.equal(result.actualLeftMarginMm, 27.5);
      assert.equal(result.actualTopMarginMm, 15);
      assert.equal(result.photos.length, 4);

      // Check photo coordinates
      const p0 = result.photos[0]!;
      assert.equal(p0.xMm, 27.5);
      assert.equal(p0.yMm, 15);
      assert.equal(p0.widthMm, 35);
      assert.equal(p0.heightMm, 45);

      const p1 = result.photos[1]!;
      assert.equal(p1.xMm, 27.5 + 35 + 5); // 67.5
      assert.equal(p1.yMm, 15);

      const p3 = result.photos[3]!;
      assert.equal(p3.xMm, 27.5 + 3 * (35 + 5)); // 147.5
      // Right edge of last photo = 147.5 + 35 = 182.5mm
      // Right margin = 210 - 182.5 = 27.5mm -> Perfectly symmetrical!
      assert.equal(210 - (p3.xMm + p3.widthMm), result.actualLeftMarginMm);
    });

    it('accommodates 6 copies in a single row with narrow photos (reference pattern)', () => {
      // Narrow photos (25mm width), 6 copies, 4mm spacing
      // Required width = 6 * 25 + 5 * 4 = 150 + 20 = 170mm <= 190mm
      // Expected left margin = (210 - 170) / 2 = 20mm
      const result = calculateSingleRowLayout({
        photoDimensions: TEST_FIXTURE_NARROW_PHOTO_SIZE,
        copyCount: 6,
        topMarginMm: 20,
        minSideMarginMm: 10,
        spacingMm: 4,
      });

      assert.equal(result.fits, true);
      assert.equal(result.copyCount, 6);
      assert.equal(result.photos.length, 6);
      assert.equal(result.actualLeftMarginMm, 20);
      assert.equal(result.requiredWidthMm, 170);

      // Symmetrical right margin check
      const lastPhoto = result.photos[5]!;
      assert.equal(210 - (lastPhoto.xMm + lastPhoto.widthMm), result.actualLeftMarginMm);
    });

    it('detects when requested copy count exceeds usable page width and reports maxFittingCount', () => {
      // 6 copies of 35mm photos, 5mm spacing on 210mm page with 10mm margins
      // Required = 6 * 35 + 5 * 5 = 210 + 25 = 235mm > 190mm -> Cannot fit!
      // maxFittingCount = floor((190 + 5) / (35 + 5)) = floor(195 / 40) = 4
      const result = calculateSingleRowLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 6,
        topMarginMm: 15,
        minSideMarginMm: 10,
        spacingMm: 5,
      });

      assert.equal(result.fits, false);
      assert.equal(result.copyCount, 6);
      assert.equal(result.maxFittingCount, 4);
      assert.equal(result.photos.length, 0);
      assert.ok(result.errors && result.errors.length > 0);
      assert.ok(result.errors?.[0]?.includes('Maximum fitting count in one row is 4'));
    });

    it('detects when wide photo does not fit even 4 copies in a single row', () => {
      // 50mm photos, 4 copies, 5mm spacing
      // Required = 4 * 50 + 3 * 5 = 215mm > 190mm -> Does not fit!
      // maxFittingCount = floor(195 / 55) = 3
      const result = calculateSingleRowLayout({
        photoDimensions: TEST_FIXTURE_WIDE_PHOTO_SIZE,
        copyCount: 4,
        topMarginMm: 15,
        minSideMarginMm: 10,
        spacingMm: 5,
      });

      assert.equal(result.fits, false);
      assert.equal(result.maxFittingCount, 3);
    });

    it('rejects invalid copy counts (zero, negative, fractional, NaN)', () => {
      const r0 = calculateSingleRowLayout({ photoDimensions: TEST_FIXTURE_PHOTO_SIZE, copyCount: 0 });
      assert.equal(r0.fits, false);

      const rNeg = calculateSingleRowLayout({ photoDimensions: TEST_FIXTURE_PHOTO_SIZE, copyCount: -2 });
      assert.equal(rNeg.fits, false);

      const rFrac = calculateSingleRowLayout({ photoDimensions: TEST_FIXTURE_PHOTO_SIZE, copyCount: 3.5 });
      assert.equal(rFrac.fits, false);
    });

    it('rejects invalid margin, spacing, and cut guide length values', () => {
      const r1 = calculateSingleRowLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 2,
        topMarginMm: -5,
      });
      assert.equal(r1.fits, false);

      const r2 = calculateSingleRowLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 2,
        spacingMm: -1,
      });
      assert.equal(r2.fits, false);

      const r3 = calculateSingleRowLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 2,
        cutGuideLengthMm: -3,
      });
      assert.equal(r3.fits, false);
    });

    it('rejects invalid sheet dimensions (NaN, Infinity, zero, negative) without throwing unhandled exceptions', () => {
      // Regression test: NaN sheetDimensions previously bypassed checks and caused an unhandled TypeError in units.ts
      const rNaN = calculateSingleRowLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 4,
        sheetDimensions: { widthMm: NaN, heightMm: 297 },
      });
      assert.equal(rNaN.fits, false);
      assert.ok(rNaN.errors && rNaN.errors.some((e) => e.includes('Sheet width must be a positive finite number')));

      const rInf = calculateSingleRowLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 4,
        sheetDimensions: { widthMm: 210, heightMm: Infinity },
      });
      assert.equal(rInf.fits, false);
      assert.ok(rInf.errors && rInf.errors.some((e) => e.includes('Sheet height must be a positive finite number')));

      const rZero = calculateSingleRowLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 4,
        sheetDimensions: { widthMm: 0, heightMm: 297 },
      });
      assert.equal(rZero.fits, false);

      const rNeg = calculateSingleRowLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 4,
        sheetDimensions: { widthMm: -210, heightMm: 297 },
      });
      assert.equal(rNeg.fits, false);
    });

    it('supports valid custom sheet dimensions (e.g. US Letter)', () => {
      // US Letter width: 215.9mm, min side margins 10mm -> usable width 195.9mm
      // 4 copies of 35mm photos with 5mm spacing -> required 155mm <= 195.9mm -> Fits!
      // Left margin = (215.9 - 155) / 2 = 30.45mm
      const result = calculateSingleRowLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 4,
        sheetDimensions: TEST_FIXTURE_US_LETTER,
      });

      assert.equal(result.fits, true);
      assert.equal(result.copyCount, 4);
      assert.ok(Math.abs(result.actualLeftMarginMm - 30.45) < 0.001);
      assert.equal(result.photos.length, 4);
    });
  });

  describe('Multi-Row Grid Layout', () => {
    it('produces a balanced 3x2 grid layout for 6 copies fitting on A4', () => {
      // 35x45mm photos, 6 copies
      // Usable width = 190mm -> maxCols = floor(195/40) = 4 cols
      // Usable height = 297 - 15 - 15 = 267mm -> maxRows = floor(272/50) = 5 rows
      // Total page capacity = 20 photos
      // For 6 copies:
      // minRows = ceil(6 / 4) = 2
      // columns = ceil(6 / 2) = 3
      // rows = ceil(6 / 3) = 2
      // Balanced layout: 3 columns x 2 rows (3 in Row 0, 3 in Row 1) rather than 4 + 2!
      const result = calculateMultiRowGridLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 6,
        topMarginMm: 15,
        minBottomMarginMm: 15,
        minSideMarginMm: 10,
        spacingXMarginMm: 5,
        spacingYMarginMm: 5,
      });

      assert.equal(result.fits, true);
      assert.equal(result.copyCount, 6);
      assert.equal(result.maxFittingCount, 20);
      assert.equal(result.columns, 3);
      assert.equal(result.rows, 2);
      assert.equal(result.photos.length, 6);

      // Required width for 3 columns: 3 * 35 + 2 * 5 = 115mm
      // Centered margin: (210 - 115) / 2 = 47.5mm
      assert.equal(result.requiredWidthMm, 115);
      assert.equal(result.actualLeftMarginMm, 47.5);

      // Verify row 0 photos (3 photos at y = 15)
      assert.equal(result.photos[0]!.xMm, 47.5);
      assert.equal(result.photos[0]!.yMm, 15);
      assert.equal(result.photos[1]!.xMm, 47.5 + 35 + 5); // 87.5
      assert.equal(result.photos[1]!.yMm, 15);
      assert.equal(result.photos[2]!.xMm, 47.5 + 2 * (35 + 5)); // 127.5
      assert.equal(result.photos[2]!.yMm, 15);

      // Verify row 1 photos (3 photos at y = 15 + 45 + 5 = 65)
      assert.equal(result.photos[3]!.xMm, 47.5);
      assert.equal(result.photos[3]!.yMm, 65);
      assert.equal(result.photos[4]!.xMm, 87.5);
      assert.equal(result.photos[4]!.yMm, 65);
      assert.equal(result.photos[5]!.xMm, 127.5);
      assert.equal(result.photos[5]!.yMm, 65);
    });

    it('produces balanced rows for uneven counts (e.g. 7 copies -> 4x2 grid with 4 in Row 0, 3 in Row 1)', () => {
      // 7 copies with maxColumns = 4:
      // minRows = ceil(7 / 4) = 2
      // columns = ceil(7 / 2) = 4
      // rows = ceil(7 / 4) = 2
      // Required width for 4 columns: 4 * 35 + 3 * 5 = 155mm
      // Centered margin: (210 - 155) / 2 = 27.5mm
      const result = calculateMultiRowGridLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 7,
      });

      assert.equal(result.fits, true);
      assert.equal(result.copyCount, 7);
      assert.equal(result.columns, 4);
      assert.equal(result.rows, 2);
      assert.equal(result.photos.length, 7);

      // Row 0 has 4 photos at y = 15
      const row0 = result.photos.filter((p) => p.yMm === 15);
      assert.equal(row0.length, 4);

      // Row 1 has 3 photos at y = 65
      const row1 = result.photos.filter((p) => p.yMm === 65);
      assert.equal(row1.length, 3);
    });

    it('produces balanced rows for 5 copies (3x2 grid with 3 in Row 0, 2 in Row 1)', () => {
      // 5 copies with maxColumns = 4:
      // minRows = ceil(5 / 4) = 2
      // columns = ceil(5 / 2) = 3
      // rows = ceil(5 / 3) = 2
      // Rather than a lopsided 4 + 1, it produces 3 + 2!
      const result = calculateMultiRowGridLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 5,
      });

      assert.equal(result.fits, true);
      assert.equal(result.columns, 3);
      assert.equal(result.rows, 2);
      assert.equal(result.photos.length, 5);

      const row0 = result.photos.filter((p) => p.yMm === 15);
      assert.equal(row0.length, 3);

      const row1 = result.photos.filter((p) => p.yMm === 65);
      assert.equal(row1.length, 2);
    });

    it('produces a balanced 3x3 grid for 9 copies on A4', () => {
      // 9 copies with maxColumns = 4:
      // minRows = ceil(9 / 4) = 3
      // columns = ceil(9 / 3) = 3
      // rows = ceil(9 / 3) = 3
      // Produces an exact 3x3 square grid rather than 4 + 4 + 1!
      const result = calculateMultiRowGridLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 9,
      });

      assert.equal(result.fits, true);
      assert.equal(result.columns, 3);
      assert.equal(result.rows, 3);
      assert.equal(result.photos.length, 9);
    });

    it('handles exact-fit single-page capacity (20 copies = 4 cols x 5 rows)', () => {
      const result = calculateMultiRowGridLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 20, // Full page capacity
      });

      assert.equal(result.fits, true);
      assert.equal(result.copyCount, 20);
      assert.equal(result.columns, 4);
      assert.equal(result.rows, 5);
      assert.equal(result.photos.length, 20);

      for (const p of result.photos) {
        assert.ok(p.xMm >= 10, `Photo ${p.index} xMm (${p.xMm}) should be >= 10`);
        assert.ok(p.xMm + p.widthMm <= 200, `Photo ${p.index} right edge should be <= 200`);
        assert.ok(p.yMm >= 15, `Photo ${p.index} yMm (${p.yMm}) should be >= 15`);
        assert.ok(p.yMm + p.heightMm <= 282, `Photo ${p.index} bottom edge should be <= 282`);
      }
    });

    it('detects when requested copy count exceeds single A4 page capacity (overflow check)', () => {
      // Single A4 capacity for 35x45 is 20 photos. Requesting 21 copies exceeds it.
      const result21 = calculateMultiRowGridLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 21,
      });

      assert.equal(result21.fits, false);
      assert.equal(result21.maxFittingCount, 20);
      assert.equal(result21.photos.length, 0);
      assert.ok(result21.errors && result21.errors[0]!.includes('exceed the single-page A4 capacity of 20'));

      const result25 = calculateMultiRowGridLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 25,
      });
      assert.equal(result25.fits, false);
      assert.equal(result25.maxFittingCount, 20);
    });

    it('rejects invalid sheet dimensions (NaN, Infinity, zero, negative) consistently in grid layout', () => {
      const rNaN = calculateMultiRowGridLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 6,
        sheetDimensions: { widthMm: NaN, heightMm: 297 },
      });
      assert.equal(rNaN.fits, false);
      assert.ok(rNaN.errors && rNaN.errors.some((e) => e.includes('Sheet width must be a positive finite number')));

      const rInf = calculateMultiRowGridLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 6,
        sheetDimensions: { widthMm: 210, heightMm: Infinity },
      });
      assert.equal(rInf.fits, false);
      assert.ok(rInf.errors && rInf.errors.some((e) => e.includes('Sheet height must be a positive finite number')));

      const rZero = calculateMultiRowGridLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 6,
        sheetDimensions: { widthMm: 0, heightMm: 297 },
      });
      assert.equal(rZero.fits, false);

      const rNeg = calculateMultiRowGridLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 6,
        sheetDimensions: { widthMm: 210, heightMm: -297 },
      });
      assert.equal(rNeg.fits, false);
    });

    it('supports valid custom sheet dimensions in multi-row grid layout (e.g. US Letter)', () => {
      const result = calculateMultiRowGridLayout({
        photoDimensions: TEST_FIXTURE_PHOTO_SIZE,
        copyCount: 6,
        sheetDimensions: TEST_FIXTURE_US_LETTER,
      });

      assert.equal(result.fits, true);
      assert.equal(result.copyCount, 6);
      assert.equal(result.photos.length, 6);
      // On US Letter (215.9 x 279.4 mm), 35x45 photos fit with 3 cols x 2 rows
      assert.equal(result.columns, 3);
      assert.equal(result.rows, 2);
    });
  });

  describe('Unified Layout Engine (calculateSheetLayout)', () => {
    describe('Settings & Input Validation', () => {
      it('validates default conservative layout settings successfully with cut guides off by default', () => {
        const val = validateSheetLayoutSettings(DEFAULT_LAYOUT_SETTINGS, TEST_FIXTURE_PHOTO_SIZE);
        assert.equal(val.valid, true);
        assert.equal(val.errors.length, 0);
        assert.equal(DEFAULT_LAYOUT_SETTINGS.includeCutGuides, false);
      });

      it('validates includeCutGuides rejecting non-boolean values and allowing optional booleans', () => {
        const valValidTrue = validateSheetLayoutSettings(
          { ...DEFAULT_LAYOUT_SETTINGS, includeCutGuides: true },
          TEST_FIXTURE_PHOTO_SIZE
        );
        assert.equal(valValidTrue.valid, true);

        const valValidFalse = validateSheetLayoutSettings(
          { ...DEFAULT_LAYOUT_SETTINGS, includeCutGuides: false },
          TEST_FIXTURE_PHOTO_SIZE
        );
        assert.equal(valValidFalse.valid, true);

        const valInvalid = validateSheetLayoutSettings(
          { ...DEFAULT_LAYOUT_SETTINGS, includeCutGuides: 'yes' as unknown as boolean },
          TEST_FIXTURE_PHOTO_SIZE
        );
        assert.equal(valInvalid.valid, false);
        assert.ok(valInvalid.errors.some((e) => e.includes('includeCutGuides must be a boolean')));
      });

      it('validates page margins rejecting negative, non-finite, and non-object values', () => {
        const resValid = validatePageMargins(DEFAULT_PAGE_MARGINS_MM);
        assert.equal(resValid.valid, true);

        const resNeg = validatePageMargins({ topMm: -5, bottomMm: 15, leftMm: 10, rightMm: 10 });
        assert.equal(resNeg.valid, false);
        assert.ok(resNeg.errors.some((e) => e.includes('Top margin must be a non-negative finite number')));

        const resNaN = validatePageMargins({ topMm: 15, bottomMm: NaN, leftMm: 10, rightMm: 10 });
        assert.equal(resNaN.valid, false);

        const resNull = validatePageMargins(null as unknown as typeof DEFAULT_PAGE_MARGINS_MM);
        assert.equal(resNull.valid, false);
      });

      it('validates layout gaps rejecting negative, non-finite, and non-object values', () => {
        const resValid = validateLayoutGaps(DEFAULT_LAYOUT_GAPS_MM);
        assert.equal(resValid.valid, true);

        const resNeg = validateLayoutGaps({ horizontalMm: -1, verticalMm: 5 });
        assert.equal(resNeg.valid, false);
        assert.ok(resNeg.errors.some((e) => e.includes('Horizontal gap must be a non-negative finite number')));

        const resInf = validateLayoutGaps({ horizontalMm: 5, verticalMm: Infinity });
        assert.equal(resInf.valid, false);
      });

      it('rejects margins that meet or exceed sheet dimensions', () => {
        const res = calculateSheetLayout(
          {
            layoutMode: 'single-row',
            copyCount: 1,
            margins: { topMm: 150, bottomMm: 150, leftMm: 10, rightMm: 10 }, // 300mm exceeds 297mm height
          },
          TEST_FIXTURE_PHOTO_SIZE
        );
        assert.equal(res.success, false);
        assert.equal(res.fits, false);
        assert.ok(res.errors.some((e) => e.includes('exceed sheet height')));
      });

      it('rejects copy counts that are zero, negative, fractional, NaN, or unreasonably large', () => {
        const invalidCounts = [0, -1, 3.5, NaN, 201];
        for (const count of invalidCounts) {
          const res = calculateSheetLayout(
            { layoutMode: 'single-row', copyCount: count },
            TEST_FIXTURE_PHOTO_SIZE
          );
          assert.equal(res.success, false);
          assert.equal(res.fits, false);
          assert.ok(res.errors.length > 0);
        }
      });

      it('rejects invalid layout modes gracefully', () => {
        const res = calculateSheetLayout(
          { layoutMode: 'circular' as unknown as 'single-row', copyCount: 4 },
          TEST_FIXTURE_PHOTO_SIZE
        );
        assert.equal(res.success, false);
        assert.ok(res.errors.some((e) => e.includes("must be 'single-row' or 'grid'")));
      });

      it('rejects invalid photo dimensions (below 15mm or above 150mm)', () => {
        const resSmall = calculateSheetLayout(
          DEFAULT_LAYOUT_SETTINGS,
          { widthMm: 10, heightMm: 45, unitPreference: 'mm' }
        );
        assert.equal(resSmall.success, false);
        assert.ok(resSmall.errors.some((e) => e.includes('cannot be less than 15 mm')));

        const resLarge = calculateSheetLayout(
          DEFAULT_LAYOUT_SETTINGS,
          { widthMm: 35, heightMm: 160, unitPreference: 'mm' }
        );
        assert.equal(resLarge.success, false);
        assert.ok(resLarge.errors.some((e) => e.includes('cannot exceed 150 mm')));
      });
    });

    describe('Single-Row Mode Placement & Boundary Fit', () => {
      it('calculates single-row placement for 4 copies of provisional 35x45mm photos on A4', () => {
        const res = calculateSheetLayout(
          {
            layoutMode: 'single-row',
            copyCount: 4,
            margins: { topMm: 15, bottomMm: 15, leftMm: 10, rightMm: 10 },
            gaps: { horizontalMm: 5, verticalMm: 5 },
            includeCutGuides: true,
          },
          TEST_FIXTURE_PHOTO_SIZE
        );

        assert.equal(res.success, true);
        assert.equal(res.fits, true);
        assert.equal(res.includeCutGuides, true);
        assert.equal(res.layoutMode, 'single-row');
        assert.equal(res.placedCount, 4);
        assert.equal(res.columns, 4);
        assert.equal(res.rows, 1);
        assert.equal(res.photos.length, 4);

        // Required: 4 * 35 + 3 * 5 = 155 mm. Usable: 210 - 20 = 190 mm.
        assert.equal(res.requiredWidthMm, 155);
        assert.equal(res.usableArea.widthMm, 190);
        assert.equal(res.usableArea.heightMm, 297 - 30); // 267 mm

        // Centered horizontally: 10 + (190 - 155) / 2 = 27.5 mm
        assert.equal(res.actualLeftMarginMm, 27.5);
        assert.equal(res.actualTopMarginMm, 15);

        // Verify each photo coordinate and cutting guides
        for (let i = 0; i < 4; i++) {
          const photo = res.photos[i]!;
          assert.equal(photo.index, i);
          assert.equal(photo.xMm, 27.5 + i * 40);
          assert.equal(photo.yMm, 15);
          assert.equal(photo.widthMm, 35);
          assert.equal(photo.heightMm, 45);
          assert.ok(photo.cutGuides.topLeft.horizontal.x1Mm < photo.xMm);
        }
      });

      it('omits cut-guide ticks when includeCutGuides is false (or defaulted to false)', () => {
        const res = calculateSheetLayout(
          {
            layoutMode: 'single-row',
            copyCount: 4,
            includeCutGuides: false,
          },
          TEST_FIXTURE_PHOTO_SIZE
        );
        assert.equal(res.success, true);
        assert.equal(res.includeCutGuides, false);
        const photo = res.photos[0]!;
        // With cut guides off, tick length is 0 so ticks coincide with photo boundary
        assert.equal(photo.cutGuides.topLeft.horizontal.x1Mm, photo.xMm);
        assert.equal(photo.cutGuides.topLeft.horizontal.x2Mm, photo.xMm);
      });

      it('detects when single-row exceeds capacity and returns structured failure without dropping copies', () => {
        // 5 copies of 35mm photos on A4 with 10mm margins = 5 * 35 + 4 * 5 = 195mm > 190mm
        const res = calculateSheetLayout(
          {
            layoutMode: 'single-row',
            copyCount: 5,
            margins: { topMm: 15, bottomMm: 15, leftMm: 10, rightMm: 10 },
            gaps: { horizontalMm: 5, verticalMm: 5 },
          },
          TEST_FIXTURE_PHOTO_SIZE
        );

        assert.equal(res.success, true);
        assert.equal(res.fits, false);
        assert.equal(res.placedCount, 0);
        assert.equal(res.photos.length, 0);
        assert.equal(res.maxFittingCount, 4);
        assert.ok(res.errors[0]?.includes('Maximum fitting count in one row is 4'));
      });

      it('fits 6 copies in a single row when photos are narrow (25mm reference pattern)', () => {
        const res = calculateSheetLayout(
          {
            layoutMode: 'single-row',
            copyCount: 6,
            margins: { topMm: 20, bottomMm: 15, leftMm: 10, rightMm: 10 },
            gaps: { horizontalMm: 4, verticalMm: 4 },
          },
          TEST_FIXTURE_NARROW_PHOTO_SIZE
        );

        assert.equal(res.success, true);
        assert.equal(res.fits, true);
        assert.equal(res.placedCount, 6);
        assert.equal(res.photos.length, 6);
        // Required: 6 * 25 + 5 * 4 = 170 mm <= 190 mm
        assert.equal(res.requiredWidthMm, 170);
        assert.equal(res.actualLeftMarginMm, 10 + (190 - 170) / 2); // 20 mm
      });

      it('reports failure when photo height exceeds usable sheet height', () => {
        const res = calculateSheetLayout(
          {
            layoutMode: 'single-row',
            copyCount: 1,
            margins: { topMm: 250, bottomMm: 30, leftMm: 10, rightMm: 10 }, // Usable height = 297 - 280 = 17 mm
          },
          TEST_FIXTURE_PHOTO_SIZE // height = 45 mm > 17 mm
        );

        assert.equal(res.success, true);
        assert.equal(res.fits, false);
        assert.ok(res.errors[0]?.includes('exceeds usable sheet height'));
      });
    });

    describe('Balanced Grid Mode Placement & Row Balance', () => {
      it('arranges 1 copy deterministically centered in grid mode', () => {
        const res = calculateSheetLayout(
          { layoutMode: 'grid', copyCount: 1 },
          TEST_FIXTURE_PHOTO_SIZE
        );
        assert.equal(res.success, true);
        assert.equal(res.fits, true);
        assert.equal(res.columns, 1);
        assert.equal(res.rows, 1);
        assert.equal(res.photos.length, 1);
        assert.equal(res.photos[0]!.xMm, (210 - 35) / 2); // Symmetrically centered: 87.5 mm
      });

      it('produces a balanced 3x2 grid for 5 copies with incomplete final row', () => {
        const res = calculateSheetLayout(
          { layoutMode: 'grid', copyCount: 5 },
          TEST_FIXTURE_PHOTO_SIZE
        );
        assert.equal(res.success, true);
        assert.equal(res.fits, true);
        assert.equal(res.columns, 3);
        assert.equal(res.rows, 2);
        assert.equal(res.photos.length, 5);

        // Row 0 has indices 0, 1, 2
        assert.equal(res.photos[0]!.yMm, res.photos[1]!.yMm);
        assert.equal(res.photos[1]!.yMm, res.photos[2]!.yMm);

        // Row 1 has indices 3, 4
        assert.equal(res.photos[3]!.yMm, res.photos[4]!.yMm);
        assert.ok(res.photos[3]!.yMm > res.photos[0]!.yMm);
        assert.equal(res.photos[3]!.xMm, res.photos[0]!.xMm); // Aligned with column 0
        assert.equal(res.photos[4]!.xMm, res.photos[1]!.xMm); // Aligned with column 1
      });

      it('produces a balanced 3x2 grid for 6 copies', () => {
        const res = calculateSheetLayout(
          { layoutMode: 'grid', copyCount: 6 },
          TEST_FIXTURE_PHOTO_SIZE
        );
        assert.equal(res.success, true);
        assert.equal(res.fits, true);
        assert.equal(res.columns, 3);
        assert.equal(res.rows, 2);
        assert.equal(res.photos.length, 6);
      });

      it('produces a balanced 4x2 grid for 7 copies (4 in row 0, 3 in row 1)', () => {
        const res = calculateSheetLayout(
          { layoutMode: 'grid', copyCount: 7 },
          TEST_FIXTURE_PHOTO_SIZE
        );
        assert.equal(res.success, true);
        assert.equal(res.fits, true);
        assert.equal(res.columns, 4);
        assert.equal(res.rows, 2);
        assert.equal(res.photos.length, 7);
      });

      it('produces a balanced 3x3 grid for 9 copies', () => {
        const res = calculateSheetLayout(
          { layoutMode: 'grid', copyCount: 9 },
          TEST_FIXTURE_PHOTO_SIZE
        );
        assert.equal(res.success, true);
        assert.equal(res.fits, true);
        assert.equal(res.columns, 3);
        assert.equal(res.rows, 3);
        assert.equal(res.photos.length, 9);
      });

      it('handles exact-fit maximum page capacity (20 copies = 4 cols x 5 rows)', () => {
        const res = calculateSheetLayout(
          { layoutMode: 'grid', copyCount: 20 },
          TEST_FIXTURE_PHOTO_SIZE
        );
        assert.equal(res.success, true);
        assert.equal(res.fits, true);
        assert.equal(res.columns, 4);
        assert.equal(res.rows, 5);
        assert.equal(res.photos.length, 20);
        assert.equal(res.maxFittingCount, 20);
      });

      it('fails with structured error when requested count exceeds sheet capacity', () => {
        const res = calculateSheetLayout(
          { layoutMode: 'grid', copyCount: 21 },
          TEST_FIXTURE_PHOTO_SIZE
        );
        assert.equal(res.success, true);
        assert.equal(res.fits, false);
        assert.equal(res.placedCount, 0);
        assert.equal(res.photos.length, 0);
        assert.equal(res.maxFittingCount, 20);
        assert.ok(res.errors[0]?.includes('exceed the single-page capacity of 20 copies'));
      });
    });

    describe('Different Photo Aspect Ratios & Sizes', () => {
      it('calculates square photo layout (50.8 x 50.8 mm / 2x2 in)', () => {
        const squareFixture: PhotoDimensions = {
          widthMm: 50.8,
          heightMm: 50.8,
          unitPreference: 'in',
        };

        const res = calculateSheetLayout(
          { layoutMode: 'grid', copyCount: 6 },
          squareFixture
        );
        assert.equal(res.success, true);
        assert.equal(res.fits, true);
        // Usable width = 190 mm. (190 + 5) / (50.8 + 5) = 195 / 55.8 = 3 cols max
        // Usable height = 267 mm. (267 + 5) / (50.8 + 5) = 272 / 55.8 = 4 rows max (maxFittingCount = 12)
        assert.equal(res.maxColumns, 3);
        assert.equal(res.maxRows, 4);
        assert.equal(res.maxFittingCount, 12);
        assert.equal(res.columns, 3);
        assert.equal(res.rows, 2);
      });

      it('calculates landscape photo layout (50 x 35 mm)', () => {
        const landscapeFixture: PhotoDimensions = {
          widthMm: 50,
          heightMm: 35,
          unitPreference: 'mm',
        };

        const res = calculateSheetLayout(
          { layoutMode: 'grid', copyCount: 6 },
          landscapeFixture
        );
        assert.equal(res.success, true);
        assert.equal(res.fits, true);
        assert.equal(res.columns, 3);
        assert.equal(res.rows, 2);
        assert.equal(res.photos[0]!.widthMm, 50);
        assert.equal(res.photos[0]!.heightMm, 35);
      });

      it('rejects photo wider than usable sheet width', () => {
        const oversizedFixture: PhotoDimensions = {
          widthMm: 145, // valid photo dimension (<= 150), but with 25mm margins: usable width = 210 - 50 = 160 mm. 2 copies = 300 mm
          heightMm: 45,
          unitPreference: 'mm',
        };

        const res = calculateSheetLayout(
          {
            layoutMode: 'single-row',
            copyCount: 2,
            margins: { topMm: 15, bottomMm: 15, leftMm: 25, rightMm: 25 },
          },
          oversizedFixture
        );
        assert.equal(res.success, true);
        assert.equal(res.fits, false);
        assert.equal(res.maxFittingCount, 1);
      });
    });

    describe('Non-Zero Margins and Gaps Geometry', () => {
      it('accurately respects custom margins and gaps', () => {
        const customMargins: PageMargins = { topMm: 20, bottomMm: 30, leftMm: 15, rightMm: 15 };
        const customGaps: LayoutGaps = { horizontalMm: 8, verticalMm: 12 };

        const res = calculateSheetLayout(
          {
            layoutMode: 'grid',
            copyCount: 6,
            margins: customMargins,
            gaps: customGaps,
          },
          TEST_FIXTURE_PHOTO_SIZE
        );

        assert.equal(res.success, true);
        assert.equal(res.fits, true);
        assert.equal(res.columns, 3);
        assert.equal(res.rows, 2);

        // Gap check between col 0 and col 1 (photos 0 and 1)
        const p0 = res.photos[0]!;
        const p1 = res.photos[1]!;
        assert.equal(p1.xMm - (p0.xMm + p0.widthMm), 8); // Horizontal gap exactly 8 mm

        // Gap check between row 0 and row 1 (photos 0 and 3)
        const p3 = res.photos[3]!;
        assert.equal(p3.yMm - (p0.yMm + p0.heightMm), 12); // Vertical gap exactly 12 mm
      });
    });

    describe('Determinism & Geometric Invariant Property Loop', () => {
      it('produces bit-for-bit identical coordinates across repeated calculations', () => {
        const run1 = calculateSheetLayout(DEFAULT_LAYOUT_SETTINGS, TEST_FIXTURE_PHOTO_SIZE);
        const run2 = calculateSheetLayout(DEFAULT_LAYOUT_SETTINGS, TEST_FIXTURE_PHOTO_SIZE);

        assert.equal(run1.photos.length, run2.photos.length);
        for (let i = 0; i < run1.photos.length; i++) {
          assert.equal(run1.photos[i]!.xMm, run2.photos[i]!.xMm);
          assert.equal(run1.photos[i]!.yMm, run2.photos[i]!.yMm);
          assert.equal(run1.photos[i]!.widthMm, run2.photos[i]!.widthMm);
          assert.equal(run1.photos[i]!.heightMm, run2.photos[i]!.heightMm);
        }
      });

      it('guarantees geometric invariants: within usable bounds and zero overlap across 25 generated cases', () => {
        const widths = [25, 35, 45, 50.8, 60];
        const heights = [30, 45, 50.8, 60, 70];
        const counts = [1, 2, 4, 6, 8];

        let evaluatedCount = 0;

        for (let i = 0; i < widths.length; i++) {
          const w = widths[i]!;
          const h = heights[i]!;
          const count = counts[i]!;
          const photoDim: PhotoDimensions = { widthMm: w, heightMm: h, unitPreference: 'mm' };

          for (const mode of ['single-row', 'grid'] as const) {
            const result = calculateSheetLayout(
              {
                layoutMode: mode,
                copyCount: count,
                margins: { topMm: 12, bottomMm: 12, leftMm: 10, rightMm: 10 },
                gaps: { horizontalMm: 4, verticalMm: 6 },
              },
              photoDim
            );

            evaluatedCount++;

            if (result.fits && result.photos.length > 0) {
              const usable = result.usableArea;
              const photos = result.photos;
              const eps = 1e-4;

              // Invariant 1: Every photo must be entirely within usable sheet boundaries
              for (const p of photos) {
                assert.ok(
                  p.xMm >= usable.originXMm - eps,
                  `Photo ${p.index} left edge (${p.xMm}mm) exceeds usable left origin (${usable.originXMm}mm)`
                );
                assert.ok(
                  p.yMm >= usable.originYMm - eps,
                  `Photo ${p.index} top edge (${p.yMm}mm) exceeds usable top origin (${usable.originYMm}mm)`
                );
                assert.ok(
                  p.xMm + p.widthMm <= usable.originXMm + usable.widthMm + eps,
                  `Photo ${p.index} right edge (${p.xMm + p.widthMm}mm) exceeds usable right boundary (${usable.originXMm + usable.widthMm}mm)`
                );
                assert.ok(
                  p.yMm + p.heightMm <= usable.originYMm + usable.heightMm + eps,
                  `Photo ${p.index} bottom edge (${p.yMm + p.heightMm}mm) exceeds usable bottom boundary (${usable.originYMm + usable.heightMm}mm)`
                );
              }

              // Invariant 2: No two distinct photos may overlap
              for (let a = 0; a < photos.length; a++) {
                for (let b = a + 1; b < photos.length; b++) {
                  const pA = photos[a]!;
                  const pB = photos[b]!;

                  const separatedHorizontally =
                    pA.xMm + pA.widthMm <= pB.xMm + eps || pB.xMm + pB.widthMm <= pA.xMm + eps;
                  const separatedVertically =
                    pA.yMm + pA.heightMm <= pB.yMm + eps || pB.yMm + pB.heightMm <= pA.yMm + eps;

                  assert.ok(
                    separatedHorizontally || separatedVertically,
                    `Photos ${a} and ${b} overlap: A=(${pA.xMm},${pA.yMm}), B=(${pB.xMm},${pB.yMm})`
                  );
                }
              }
            }
          }
        }

        assert.equal(evaluatedCount, 10);
      });
    });
  });
});

