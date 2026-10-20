import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMaxCapacity,
  getLayoutFeedback,
  COMMON_LAYOUT_PRESETS,
} from '../src/utils/sheetLayoutControls.ts';
import {
  type PhotoDimensions,
  type SheetLayoutSettings,
  A4_SHEET_DIMENSIONS_MM,
  DEFAULT_PAGE_MARGINS_MM,
  DEFAULT_LAYOUT_GAPS_MM,
  PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS,
  calculateSheetLayout,
} from '@passport-photo/shared';

const STANDARD_PHOTO_35X45: PhotoDimensions = Object.freeze({
  widthMm: 35,
  heightMm: 45,
  unitPreference: 'mm',
});

const NARROW_PHOTO_25X35: PhotoDimensions = Object.freeze({
  widthMm: 25,
  heightMm: 35,
  unitPreference: 'mm',
});

const LARGE_SQUARE_PHOTO_50X50: PhotoDimensions = Object.freeze({
  widthMm: 50.8,
  heightMm: 50.8,
  unitPreference: 'in',
});

describe('Sheet Layout Controls & Feedback Engine', () => {
  describe('Presets Configuration', () => {
    it('defines standard quick presets with valid configurations', () => {
      assert.ok(COMMON_LAYOUT_PRESETS.length >= 4);

      const preset6Row = COMMON_LAYOUT_PRESETS.find((p) => p.id === 'preset-6-row');
      assert.ok(preset6Row);
      assert.equal(preset6Row?.count, 6);
      assert.equal(preset6Row?.mode, 'single-row');

      const preset8 = COMMON_LAYOUT_PRESETS.find((p) => p.id === 'preset-8');
      assert.ok(preset8);
      assert.equal(preset8?.count, 8);
      assert.equal(preset8?.mode, 'grid');

      const presetMax = COMMON_LAYOUT_PRESETS.find((p) => p.id === 'preset-max');
      assert.ok(presetMax);
      assert.equal(presetMax?.count, 'max');
    });
  });

  describe('calculateMaxCapacity', () => {
    it('calculates single-row maximum fitting capacity for standard 35x45 mm photos', () => {
      // Usable width = 210 - 20 = 190 mm.
      // (190 + 5) / (35 + 5) = 195 / 40 = 4.875 -> 4 copies
      const maxRow = calculateMaxCapacity(STANDARD_PHOTO_35X45, 'single-row');
      assert.equal(maxRow, 4);
    });

    it('calculates single-row capacity for narrow 25 mm photos (reference 6-copy pattern)', () => {
      // Usable width = 210 - 20 = 190 mm.
      // (190 + 5) / (25 + 5) = 195 / 30 = 6.5 -> 6 copies
      const maxRow = calculateMaxCapacity(NARROW_PHOTO_25X35, 'single-row');
      assert.equal(maxRow, 6);
    });

    it('calculates multi-row grid maximum capacity for standard 35x45 mm photos', () => {
      // Columns = 4, Rows = floor((297 - 30 + 5) / (45 + 5)) = floor(272 / 50) = 5 rows
      // 4 * 5 = 20 copies
      const maxGrid = calculateMaxCapacity(STANDARD_PHOTO_35X45, 'grid');
      assert.equal(maxGrid, 20);
    });

    it('calculates grid capacity for 50.8x50.8 mm (2x2 inch) square photos', () => {
      // Usable width = 190 mm. (190 + 5) / (50.8 + 5) = 195 / 55.8 = 3.49 -> 3 columns
      // Usable height = 267 mm. (267 + 5) / (50.8 + 5) = 272 / 55.8 = 4.87 -> 4 rows
      // 3 * 4 = 12 copies
      const maxGrid = calculateMaxCapacity(LARGE_SQUARE_PHOTO_50X50, 'grid');
      assert.equal(maxGrid, 12);
    });

    it('adjusts capacity dynamically when custom margins are provided', () => {
      // Generous side margins of 35mm each -> usable width = 210 - 70 = 140 mm
      // (140 + 5) / (35 + 5) = 145 / 40 = 3.625 -> 3 copies
      const customMargins = { topMm: 15, bottomMm: 15, leftMm: 35, rightMm: 35 };
      const maxRow = calculateMaxCapacity(STANDARD_PHOTO_35X45, 'single-row', customMargins);
      assert.equal(maxRow, 3);
    });
  });

  describe('getLayoutFeedback', () => {
    it('returns success feedback when single-row layout fits', () => {
      const settings: SheetLayoutSettings = {
        sheetDimensions: A4_SHEET_DIMENSIONS_MM,
        margins: DEFAULT_PAGE_MARGINS_MM,
        gaps: DEFAULT_LAYOUT_GAPS_MM,
        layoutMode: 'single-row',
        copyCount: 4,
      };
      const result = calculateSheetLayout(settings, STANDARD_PHOTO_35X45);
      const feedback = getLayoutFeedback(result, STANDARD_PHOTO_35X45, 'single-row');

      assert.equal(feedback.type, 'success');
      assert.equal(feedback.canSwitchToGrid, false);
      assert.ok(feedback.message.includes('4 copies arranged horizontally in 1 row'));
    });

    it('returns actionable warning feedback when single-row layout exceeds usable width', () => {
      const settings: SheetLayoutSettings = {
        sheetDimensions: A4_SHEET_DIMENSIONS_MM,
        margins: DEFAULT_PAGE_MARGINS_MM,
        gaps: DEFAULT_LAYOUT_GAPS_MM,
        layoutMode: 'single-row',
        copyCount: 6, // 6 copies of 35 mm photos require 235 mm, but usable width is 190 mm
      };
      const result = calculateSheetLayout(settings, STANDARD_PHOTO_35X45);
      const feedback = getLayoutFeedback(result, STANDARD_PHOTO_35X45, 'single-row');

      assert.equal(feedback.type, 'warning');
      assert.equal(feedback.canSwitchToGrid, true);
      assert.equal(feedback.suggestedMaxCount, 4);
      assert.ok(feedback.message.includes('Only 4 copies of this size'));
      assert.ok(feedback.message.includes('switch to Balanced Grid'));
    });

    it('returns success feedback when balanced grid layout fits', () => {
      const settings: SheetLayoutSettings = {
        sheetDimensions: A4_SHEET_DIMENSIONS_MM,
        margins: DEFAULT_PAGE_MARGINS_MM,
        gaps: DEFAULT_LAYOUT_GAPS_MM,
        layoutMode: 'grid',
        copyCount: 8,
      };
      const result = calculateSheetLayout(settings, STANDARD_PHOTO_35X45);
      const feedback = getLayoutFeedback(result, STANDARD_PHOTO_35X45, 'grid');

      assert.equal(feedback.type, 'success');
      assert.equal(feedback.canSwitchToGrid, false);
      assert.ok(feedback.message.includes('8 copies arranged in a balanced 2 × 4 grid'));
    });

    it('returns capacity warning feedback when grid layout exceeds single A4 page', () => {
      const settings: SheetLayoutSettings = {
        sheetDimensions: A4_SHEET_DIMENSIONS_MM,
        margins: DEFAULT_PAGE_MARGINS_MM,
        gaps: DEFAULT_LAYOUT_GAPS_MM,
        layoutMode: 'grid',
        copyCount: 25, // Single A4 holds at most 20 copies of 35x45
      };
      const result = calculateSheetLayout(settings, STANDARD_PHOTO_35X45);
      const feedback = getLayoutFeedback(result, STANDARD_PHOTO_35X45, 'grid');

      assert.equal(feedback.type, 'warning');
      assert.equal(feedback.canSwitchToGrid, false);
      assert.equal(feedback.suggestedMaxCount, 20);
      assert.ok(feedback.message.includes('at most 20 copies'));
    });

    it('handles provisional default photo dimensions seamlessly', () => {
      const settings: SheetLayoutSettings = {
        sheetDimensions: A4_SHEET_DIMENSIONS_MM,
        margins: DEFAULT_PAGE_MARGINS_MM,
        gaps: DEFAULT_LAYOUT_GAPS_MM,
        layoutMode: 'grid',
        copyCount: 6,
      };
      const result = calculateSheetLayout(settings, PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS);
      const feedback = getLayoutFeedback(result, PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS, 'grid');

      assert.equal(feedback.type, 'success');
      assert.equal(result.fits, true);
      assert.equal(result.placedCount, 6);
    });

    it('reports error feedback when layout settings are mathematically invalid', () => {
      const invalidSettings: SheetLayoutSettings = {
        sheetDimensions: A4_SHEET_DIMENSIONS_MM,
        margins: { topMm: 200, bottomMm: 200, leftMm: 10, rightMm: 10 }, // Margins exceed sheet height
        gaps: DEFAULT_LAYOUT_GAPS_MM,
        layoutMode: 'grid',
        copyCount: 6,
      };
      const result = calculateSheetLayout(invalidSettings, STANDARD_PHOTO_35X45);
      const feedback = getLayoutFeedback(result, STANDARD_PHOTO_35X45, 'grid');

      assert.equal(feedback.type, 'error');
      assert.ok(feedback.message.includes('meet or exceed sheet height'));
    });
  });
});
