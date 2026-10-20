/**
 * A4 Sheet Layout & Photo Placement Geometry Engine.
 *
 * All primary calculations operate in millimeters.
 * Point conversions use the exact relationship: 1 mm = 72 / 25.4 pt.
 *
 * Core principles:
 * - Deterministic, pure geometric positioning.
 * - Does not silently scale or shrink photos when space is insufficient.
 * - Returns clear typed failure results with max fitting capacity when arrangements exceed page bounds.
 * - Symmetrically centers rows and grids within usable page area when they fit.
 */

import { mmToPoints } from './units.js';
import { PhotoDimensions, validatePhotoDimensions } from './dimensions.js';

export interface SheetDimensions {
  readonly widthMm: number;
  readonly heightMm: number;
}

export interface SheetValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * Validates sheet dimensions ensuring width and height are finite positive numbers.
 */
export function validateSheetDimensions(sheet: SheetDimensions): SheetValidationResult {
  const errors: string[] = [];

  if (!sheet || typeof sheet !== 'object') {
    return { valid: false, errors: ['Sheet dimensions must be an object.'] };
  }

  const { widthMm, heightMm } = sheet;

  if (typeof widthMm !== 'number' || !Number.isFinite(widthMm) || widthMm <= 0) {
    errors.push(`Sheet width must be a positive finite number. Received: ${widthMm}`);
  }

  if (typeof heightMm !== 'number' || !Number.isFinite(heightMm) || heightMm <= 0) {
    errors.push(`Sheet height must be a positive finite number. Received: ${heightMm}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Standard international A4 portrait page dimensions (210 mm x 297 mm).
 */
export const A4_SHEET_DIMENSIONS_MM: SheetDimensions = Object.freeze({
  widthMm: 210,
  heightMm: 297,
});

/**
 * Small geometric epsilon (0.1 micron = 0.0001 mm) for floating point boundary tolerance.
 */
export const EPSILON_MM = 1e-4;

/**
 * Maximum reasonable copy count for single-sheet layout validation.
 */
export const MAX_REASONABLE_COPY_COUNT = 200;

/**
 * Physical page margins in millimeters.
 *
 * NOTE: Consumer inkjet and laser printers typically have non-printable hardware margins
 * (typically 3 to 6 mm) along paper edges for paper feed rollers.
 * Borderless printing depends on printer driver support and paper type.
 */
export interface PageMargins {
  readonly topMm: number;
  readonly bottomMm: number;
  readonly leftMm: number;
  readonly rightMm: number;
}

export interface MarginsValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * Validates page margins ensuring each value is a non-negative finite number.
 */
export function validatePageMargins(margins: PageMargins): MarginsValidationResult {
  const errors: string[] = [];

  if (!margins || typeof margins !== 'object') {
    return { valid: false, errors: ['Page margins must be an object.'] };
  }

  const { topMm, bottomMm, leftMm, rightMm } = margins;

  if (typeof topMm !== 'number' || !Number.isFinite(topMm) || topMm < 0) {
    errors.push(`Top margin must be a non-negative finite number. Received: ${topMm}`);
  }
  if (typeof bottomMm !== 'number' || !Number.isFinite(bottomMm) || bottomMm < 0) {
    errors.push(`Bottom margin must be a non-negative finite number. Received: ${bottomMm}`);
  }
  if (typeof leftMm !== 'number' || !Number.isFinite(leftMm) || leftMm < 0) {
    errors.push(`Left margin must be a non-negative finite number. Received: ${leftMm}`);
  }
  if (typeof rightMm !== 'number' || !Number.isFinite(rightMm) || rightMm < 0) {
    errors.push(`Right margin must be a non-negative finite number. Received: ${rightMm}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Conservative default page margins in millimeters.
 * Provides comfortable 10mm horizontal and 15mm vertical margins for consumer printers.
 */
export const DEFAULT_PAGE_MARGINS_MM: PageMargins = Object.freeze({
  topMm: 15,
  bottomMm: 15,
  leftMm: 10,
  rightMm: 10,
});

/**
 * Physical spacing (gaps) between adjacent photos in millimeters.
 */
export interface LayoutGaps {
  readonly horizontalMm: number;
  readonly verticalMm: number;
}

export interface GapsValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * Validates layout gaps ensuring horizontal and vertical spacings are non-negative finite numbers.
 */
export function validateLayoutGaps(gaps: LayoutGaps): GapsValidationResult {
  const errors: string[] = [];

  if (!gaps || typeof gaps !== 'object') {
    return { valid: false, errors: ['Layout gaps must be an object.'] };
  }

  const { horizontalMm, verticalMm } = gaps;

  if (typeof horizontalMm !== 'number' || !Number.isFinite(horizontalMm) || horizontalMm < 0) {
    errors.push(`Horizontal gap must be a non-negative finite number. Received: ${horizontalMm}`);
  }
  if (typeof verticalMm !== 'number' || !Number.isFinite(verticalMm) || verticalMm < 0) {
    errors.push(`Vertical gap must be a non-negative finite number. Received: ${verticalMm}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Standard default gaps between photos (5mm spacing for convenient manual scissor cutting).
 */
export const DEFAULT_LAYOUT_GAPS_MM: LayoutGaps = Object.freeze({
  horizontalMm: 5,
  verticalMm: 5,
});

/**
 * Default corner cut-guide tick length in millimeters.
 */
export const DEFAULT_CUT_GUIDE_LENGTH_MM = 3;

/**
 * Supported layout arrangement modes.
 */
export type LayoutMode = 'single-row' | 'grid';

/**
 * Physical usable area of the sheet after subtracting page margins.
 */
export interface UsableSheetArea {
  readonly originXMm: number;
  readonly originYMm: number;
  readonly widthMm: number;
  readonly heightMm: number;
}

/**
 * Configuration settings for sheet layout generation.
 */
export interface SheetLayoutSettings {
  readonly sheetDimensions?: SheetDimensions;
  readonly margins?: PageMargins;
  readonly gaps?: LayoutGaps;
  readonly layoutMode: LayoutMode;
  readonly copyCount: number;
  readonly cutGuideLengthMm?: number;
  readonly includeCutGuides?: boolean;
}

/**
 * Default layout configuration: 6 copies on an A4 sheet with single-row layout.
 * Cut guides are off by default.
 */
export const DEFAULT_LAYOUT_SETTINGS: SheetLayoutSettings = Object.freeze({
  sheetDimensions: A4_SHEET_DIMENSIONS_MM,
  margins: DEFAULT_PAGE_MARGINS_MM,
  gaps: DEFAULT_LAYOUT_GAPS_MM,
  layoutMode: 'single-row',
  copyCount: 6,
  cutGuideLengthMm: DEFAULT_CUT_GUIDE_LENGTH_MM,
  includeCutGuides: false,
});

export interface SettingsValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * Validates complete layout settings and photo dimensions.
 */
export function validateSheetLayoutSettings(
  settings: SheetLayoutSettings,
  photoDimensions: PhotoDimensions
): SettingsValidationResult {
  const errors: string[] = [];

  if (!settings || typeof settings !== 'object') {
    return { valid: false, errors: ['Layout settings must be an object.'] };
  }

  // 1. Validate photo dimensions
  const photoVal = validatePhotoDimensions(photoDimensions);
  if (!photoVal.valid) {
    errors.push(...photoVal.errors);
  }

  // 2. Validate sheet dimensions
  const sheet = settings.sheetDimensions ?? A4_SHEET_DIMENSIONS_MM;
  const sheetVal = validateSheetDimensions(sheet);
  if (!sheetVal.valid) {
    errors.push(...sheetVal.errors);
  }

  // 3. Validate margins
  const margins = settings.margins ?? DEFAULT_PAGE_MARGINS_MM;
  const marginsVal = validatePageMargins(margins);
  if (!marginsVal.valid) {
    errors.push(...marginsVal.errors);
  }

  // 4. Validate gaps
  const gaps = settings.gaps ?? DEFAULT_LAYOUT_GAPS_MM;
  const gapsVal = validateLayoutGaps(gaps);
  if (!gapsVal.valid) {
    errors.push(...gapsVal.errors);
  }

  // 5. Validate layout mode
  if (settings.layoutMode !== 'single-row' && settings.layoutMode !== 'grid') {
    errors.push(`Layout mode must be 'single-row' or 'grid'. Received: ${String(settings.layoutMode)}`);
  }

  // 6. Validate copy count
  const count = settings.copyCount;
  if (typeof count !== 'number' || !Number.isInteger(count) || count <= 0) {
    errors.push(`Copy count must be a positive integer. Received: ${count}`);
  } else if (count > MAX_REASONABLE_COPY_COUNT) {
    errors.push(`Copy count exceeds maximum allowed limit (${MAX_REASONABLE_COPY_COUNT}). Received: ${count}`);
  }

  // 7. Validate cut guide length
  const cutGuide = settings.cutGuideLengthMm ?? DEFAULT_CUT_GUIDE_LENGTH_MM;
  if (typeof cutGuide !== 'number' || !Number.isFinite(cutGuide) || cutGuide < 0) {
    errors.push(`Cut guide length must be a non-negative finite number. Received: ${cutGuide}`);
  }

  // 8. Validate includeCutGuides
  if (settings.includeCutGuides !== undefined && typeof settings.includeCutGuides !== 'boolean') {
    errors.push(`includeCutGuides must be a boolean. Received: ${String(settings.includeCutGuides)}`);
  }

  // 9. Usable sheet area check (if sheet & margins were structurally valid)
  if (sheetVal.valid && marginsVal.valid) {
    const usableW = sheet.widthMm - (margins.leftMm + margins.rightMm);
    const usableH = sheet.heightMm - (margins.topMm + margins.bottomMm);
    if (usableW <= 0) {
      errors.push(
        `Page margins (left ${margins.leftMm} mm + right ${margins.rightMm} mm) meet or exceed sheet width (${sheet.widthMm} mm).`
      );
    }
    if (usableH <= 0) {
      errors.push(
        `Page margins (top ${margins.topMm} mm + bottom ${margins.bottomMm} mm) meet or exceed sheet height (${sheet.heightMm} mm).`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Comprehensive physical layout calculation result for printing and rendering.
 */
export interface SheetLayoutResult {
  readonly success: boolean;
  readonly fits: boolean;
  readonly layoutMode: LayoutMode;
  readonly sheetDimensions: SheetDimensions;
  readonly usableArea: UsableSheetArea;
  readonly photoDimensions: PhotoDimensions;
  readonly requestedCount: number;
  readonly placedCount: number;
  readonly maxFittingCount: number;
  readonly columns: number;
  readonly rows: number;
  readonly maxColumns: number;
  readonly maxRows: number;
  readonly requiredWidthMm: number;
  readonly requiredHeightMm: number;
  readonly actualLeftMarginMm: number;
  readonly actualTopMarginMm: number;
  readonly includeCutGuides: boolean;
  readonly photos: readonly PlacedPhoto[];
  readonly errors: readonly string[];
}


/**
 * Mathematical 2D line segment in both millimeters and points.
 */
export interface LineSegment {
  readonly x1Mm: number;
  readonly y1Mm: number;
  readonly x2Mm: number;
  readonly y2Mm: number;
  readonly x1Pt: number;
  readonly y1Pt: number;
  readonly x2Pt: number;
  readonly y2Pt: number;
}

/**
 * Corner tick line pairs (horizontal and vertical) for one corner of a photo.
 */
export interface CornerCutGuides {
  readonly horizontal: LineSegment;
  readonly vertical: LineSegment;
}

/**
 * Four corner cut-guide ticks for a placed photo.
 */
export interface CutGuideLines {
  readonly topLeft: CornerCutGuides;
  readonly topRight: CornerCutGuides;
  readonly bottomLeft: CornerCutGuides;
  readonly bottomRight: CornerCutGuides;
}

/**
 * A single photo placed on the sheet with exact physical and point coordinates.
 */
export interface PlacedPhoto {
  readonly index: number;
  readonly xMm: number;
  readonly yMm: number;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly xPt: number;
  readonly yPt: number;
  readonly widthPt: number;
  readonly heightPt: number;
  readonly cutGuides: CutGuideLines;
}

export interface SingleRowLayoutInput {
  readonly photoDimensions: PhotoDimensions;
  readonly copyCount: number;
  readonly topMarginMm?: number;
  readonly minSideMarginMm?: number;
  readonly spacingMm?: number;
  readonly sheetDimensions?: SheetDimensions;
  readonly cutGuideLengthMm?: number;
}

export interface SingleRowLayoutResult {
  readonly fits: boolean;
  readonly copyCount: number;
  readonly maxFittingCount: number;
  readonly requiredWidthMm: number;
  readonly availableWidthMm: number;
  readonly photos: readonly PlacedPhoto[];
  readonly actualLeftMarginMm: number;
  readonly actualTopMarginMm: number;
  readonly errors?: readonly string[];
}

export interface MultiRowGridLayoutInput {
  readonly photoDimensions: PhotoDimensions;
  readonly copyCount: number;
  readonly topMarginMm?: number;
  readonly minBottomMarginMm?: number;
  readonly minSideMarginMm?: number;
  readonly spacingXMarginMm?: number;
  readonly spacingYMarginMm?: number;
  readonly sheetDimensions?: SheetDimensions;
  readonly cutGuideLengthMm?: number;
}

export interface MultiRowGridLayoutResult {
  readonly fits: boolean;
  readonly copyCount: number;
  readonly maxFittingCount: number;
  readonly columns: number;
  readonly rows: number;
  readonly maxColumns: number;
  readonly maxRows: number;
  readonly requiredWidthMm: number;
  readonly requiredHeightMm: number;
  readonly availableWidthMm: number;
  readonly availableHeightMm: number;
  readonly photos: readonly PlacedPhoto[];
  readonly actualLeftMarginMm: number;
  readonly actualTopMarginMm: number;
  readonly errors?: readonly string[];
}

/**
 * Computes cut-guide coordinate segments extending outward from a photo's bounding box.
 */
export function calculateCutGuides(
  xMm: number,
  yMm: number,
  wMm: number,
  hMm: number,
  tickLengthMm: number = 3
): CutGuideLines {
  function makeSegment(x1: number, y1: number, x2: number, y2: number): LineSegment {
    return {
      x1Mm: x1,
      y1Mm: y1,
      x2Mm: x2,
      y2Mm: y2,
      x1Pt: mmToPoints(x1),
      y1Pt: mmToPoints(y1),
      x2Pt: mmToPoints(x2),
      y2Pt: mmToPoints(y2),
    };
  }

  return {
    topLeft: {
      horizontal: makeSegment(xMm - tickLengthMm, yMm, xMm, yMm),
      vertical: makeSegment(xMm, yMm - tickLengthMm, xMm, yMm),
    },
    topRight: {
      horizontal: makeSegment(xMm + wMm, yMm, xMm + wMm + tickLengthMm, yMm),
      vertical: makeSegment(xMm + wMm, yMm - tickLengthMm, xMm + wMm, yMm),
    },
    bottomLeft: {
      horizontal: makeSegment(xMm - tickLengthMm, yMm + hMm, xMm, yMm + hMm),
      vertical: makeSegment(xMm, yMm + hMm, xMm, yMm + hMm + tickLengthMm),
    },
    bottomRight: {
      horizontal: makeSegment(xMm + wMm, yMm + hMm, xMm + wMm + tickLengthMm, yMm + hMm),
      vertical: makeSegment(xMm + wMm, yMm + hMm, xMm + wMm, yMm + hMm + tickLengthMm),
    },
  };
}

/**
 * Creates a PlacedPhoto object with both millimeter and PDF point coordinates.
 */
function createPlacedPhoto(
  index: number,
  xMm: number,
  yMm: number,
  wMm: number,
  hMm: number,
  cutGuideLengthMm: number = 3
): PlacedPhoto {
  return {
    index,
    xMm,
    yMm,
    widthMm: wMm,
    heightMm: hMm,
    xPt: mmToPoints(xMm),
    yPt: mmToPoints(yMm),
    widthPt: mmToPoints(wMm),
    heightPt: mmToPoints(hMm),
    cutGuides: calculateCutGuides(xMm, yMm, wMm, hMm, cutGuideLengthMm),
  };
}

/**
 * Computes a configurable single-row layout near the top of an A4 sheet.
 *
 * REFERENCE PATTERN:
 * Inspired by `passport size sample.pdf` (which illustrates 6 copies in a single horizontal row).
 * This layout accepts an arbitrary copy count N, centers the row horizontally within available
 * width when it fits, and returns an explicit failure result if the requested count cannot fit.
 */
export function calculateSingleRowLayout(input: SingleRowLayoutInput): SingleRowLayoutResult {
  const errors: string[] = [];

  // Validate photo dimensions
  const dimValidation = validatePhotoDimensions(input.photoDimensions);
  if (!dimValidation.valid) {
    return {
      fits: false,
      copyCount: input.copyCount,
      maxFittingCount: 0,
      requiredWidthMm: 0,
      availableWidthMm: 0,
      photos: [],
      actualLeftMarginMm: 0,
      actualTopMarginMm: 0,
      errors: dimValidation.errors,
    };
  }

  // Validate copy count
  if (!Number.isInteger(input.copyCount) || input.copyCount <= 0) {
    errors.push(`Copy count must be a positive integer. Received: ${input.copyCount}`);
    return {
      fits: false,
      copyCount: input.copyCount,
      maxFittingCount: 0,
      requiredWidthMm: 0,
      availableWidthMm: 0,
      photos: [],
      actualLeftMarginMm: 0,
      actualTopMarginMm: 0,
      errors,
    };
  }

  const sheet = input.sheetDimensions ?? A4_SHEET_DIMENSIONS_MM;
  const topMargin = input.topMarginMm ?? 15;
  const minSideMargin = input.minSideMarginMm ?? 10;
  const spacing = input.spacingMm ?? 5;
  const cutGuideLength = input.cutGuideLengthMm ?? 3;
  const w = input.photoDimensions.widthMm;
  const h = input.photoDimensions.heightMm;
  const count = input.copyCount;

  // Validate sheet dimensions
  const sheetValidation = validateSheetDimensions(sheet);
  if (!sheetValidation.valid) {
    errors.push(...sheetValidation.errors);
  }

  // Validate margin and spacing inputs
  if (topMargin < 0 || !Number.isFinite(topMargin)) errors.push('Top margin must be a non-negative finite number.');
  if (minSideMargin < 0 || !Number.isFinite(minSideMargin)) errors.push('Min side margin must be a non-negative finite number.');
  if (spacing < 0 || !Number.isFinite(spacing)) errors.push('Spacing must be a non-negative finite number.');
  if (cutGuideLength < 0 || !Number.isFinite(cutGuideLength)) errors.push('Cut guide length must be a non-negative finite number.');

  if (errors.length > 0) {
    return {
      fits: false,
      copyCount: count,
      maxFittingCount: 0,
      requiredWidthMm: 0,
      availableWidthMm: 0,
      photos: [],
      actualLeftMarginMm: 0,
      actualTopMarginMm: 0,
      errors,
    };
  }

  const availableWidth = sheet.widthMm - (2 * minSideMargin);
  const requiredWidth = count * w + (count - 1) * spacing;

  // Calculate maximum copies that could fit in a single row
  const maxFittingCount = availableWidth >= w ? Math.floor((availableWidth + spacing) / (w + spacing)) : 0;

  // Check if row exceeds available width
  if (requiredWidth > availableWidth) {
    return {
      fits: false,
      copyCount: count,
      maxFittingCount,
      requiredWidthMm: requiredWidth,
      availableWidthMm: availableWidth,
      photos: [],
      actualLeftMarginMm: 0,
      actualTopMarginMm: topMargin,
      errors: [
        `Requested ${count} copies require ${requiredWidth.toFixed(1)} mm width, but usable width is only ${availableWidth.toFixed(1)} mm. Maximum fitting count in one row is ${maxFittingCount}.`,
      ],
    };
  }

  // Check vertical page fit
  if (topMargin + h > sheet.heightMm) {
    return {
      fits: false,
      copyCount: count,
      maxFittingCount,
      requiredWidthMm: requiredWidth,
      availableWidthMm: availableWidth,
      photos: [],
      actualLeftMarginMm: 0,
      actualTopMarginMm: topMargin,
      errors: [`Photo height (${h} mm) plus top margin (${topMargin} mm) exceeds sheet height (${sheet.heightMm} mm).`],
    };
  }

  // Row fits! Calculate symmetrical centering margin
  const actualLeftMargin = (sheet.widthMm - requiredWidth) / 2;
  const photos: PlacedPhoto[] = [];

  for (let i = 0; i < count; i++) {
    const x = actualLeftMargin + i * (w + spacing);
    const y = topMargin;
    photos.push(createPlacedPhoto(i, x, y, w, h, cutGuideLength));
  }

  return {
    fits: true,
    copyCount: count,
    maxFittingCount,
    requiredWidthMm: requiredWidth,
    availableWidthMm: availableWidth,
    photos,
    actualLeftMarginMm: actualLeftMargin,
    actualTopMarginMm: topMargin,
  };
}

/**
 * Computes a multi-row grid layout packing copies across rows and columns.
 *
 * ORDERING & PACKING STRATEGY:
 * - Row-major order (left-to-right, top-to-bottom).
 * - Symmetrically centers the grid bounding box horizontally within sheet width.
 * - Symmetrically aligns the grid vertically starting from topMargin.
 * - Balanced Column Selection:
 *   Instead of greedily packing maxColumns into Row 0 (which creates sparse trailing rows, e.g. 4+2 for 6 copies),
 *   the algorithm determines the minimum number of rows required to fit the count (minRows = ceil(count / maxColumns)),
 *   and then distributes copies across those rows (columns = ceil(count / minRows)).
 *   For example:
 *     - 6 copies with maxColumns = 4 yields minRows = 2, columns = 3 (3x2 grid), rather than 4+2.
 *     - 7 copies with maxColumns = 4 yields minRows = 2, columns = 4 (4x2 grid, 4 in Row 0, 3 in Row 1).
 *     - 9 copies with maxColumns = 4 yields minRows = 3, columns = 3 (3x3 grid), rather than 4+4+1.
 *   This is a deterministic row-minimizing balanced heuristic, not a claim of global multi-objective optimality.
 * - Detects when total copies exceed single-page capacity and reports insufficient space.
 */
export function calculateMultiRowGridLayout(input: MultiRowGridLayoutInput): MultiRowGridLayoutResult {
  const errors: string[] = [];

  const dimValidation = validatePhotoDimensions(input.photoDimensions);
  if (!dimValidation.valid) {
    return {
      fits: false,
      copyCount: input.copyCount,
      maxFittingCount: 0,
      columns: 0,
      rows: 0,
      maxColumns: 0,
      maxRows: 0,
      requiredWidthMm: 0,
      requiredHeightMm: 0,
      availableWidthMm: 0,
      availableHeightMm: 0,
      photos: [],
      actualLeftMarginMm: 0,
      actualTopMarginMm: 0,
      errors: dimValidation.errors,
    };
  }

  if (!Number.isInteger(input.copyCount) || input.copyCount <= 0) {
    errors.push(`Copy count must be a positive integer. Received: ${input.copyCount}`);
    return {
      fits: false,
      copyCount: input.copyCount,
      maxFittingCount: 0,
      columns: 0,
      rows: 0,
      maxColumns: 0,
      maxRows: 0,
      requiredWidthMm: 0,
      requiredHeightMm: 0,
      availableWidthMm: 0,
      availableHeightMm: 0,
      photos: [],
      actualLeftMarginMm: 0,
      actualTopMarginMm: 0,
      errors,
    };
  }

  const sheet = input.sheetDimensions ?? A4_SHEET_DIMENSIONS_MM;
  const topMargin = input.topMarginMm ?? 15;
  const minBottomMargin = input.minBottomMarginMm ?? 15;
  const minSideMargin = input.minSideMarginMm ?? 10;
  const spacingX = input.spacingXMarginMm ?? 5;
  const spacingY = input.spacingYMarginMm ?? 5;
  const cutGuideLength = input.cutGuideLengthMm ?? 3;
  const w = input.photoDimensions.widthMm;
  const h = input.photoDimensions.heightMm;
  const count = input.copyCount;

  // Validate sheet dimensions
  const sheetValidation = validateSheetDimensions(sheet);
  if (!sheetValidation.valid) {
    errors.push(...sheetValidation.errors);
  }

  if (topMargin < 0 || !Number.isFinite(topMargin)) errors.push('Top margin must be a non-negative finite number.');
  if (minBottomMargin < 0 || !Number.isFinite(minBottomMargin)) errors.push('Bottom margin must be a non-negative finite number.');
  if (minSideMargin < 0 || !Number.isFinite(minSideMargin)) errors.push('Side margin must be a non-negative finite number.');
  if (spacingX < 0 || !Number.isFinite(spacingX)) errors.push('Horizontal spacing must be a non-negative finite number.');
  if (spacingY < 0 || !Number.isFinite(spacingY)) errors.push('Vertical spacing must be a non-negative finite number.');
  if (cutGuideLength < 0 || !Number.isFinite(cutGuideLength)) errors.push('Cut guide length must be a non-negative finite number.');

  if (errors.length > 0) {
    return {
      fits: false,
      copyCount: count,
      maxFittingCount: 0,
      columns: 0,
      rows: 0,
      maxColumns: 0,
      maxRows: 0,
      requiredWidthMm: 0,
      requiredHeightMm: 0,
      availableWidthMm: 0,
      availableHeightMm: 0,
      photos: [],
      actualLeftMarginMm: 0,
      actualTopMarginMm: 0,
      errors,
    };
  }

  const availableWidth = sheet.widthMm - (2 * minSideMargin);
  const availableHeight = sheet.heightMm - topMargin - minBottomMargin;

  const maxColumns = availableWidth >= w ? Math.floor((availableWidth + spacingX) / (w + spacingX)) : 0;
  const maxRows = availableHeight >= h ? Math.floor((availableHeight + spacingY) / (h + spacingY)) : 0;
  const maxFittingCount = maxColumns * maxRows;

  if (maxFittingCount === 0 || count > maxFittingCount) {
    return {
      fits: false,
      copyCount: count,
      maxFittingCount,
      columns: 0,
      rows: 0,
      maxColumns,
      maxRows,
      requiredWidthMm: 0,
      requiredHeightMm: 0,
      availableWidthMm: availableWidth,
      availableHeightMm: availableHeight,
      photos: [],
      actualLeftMarginMm: 0,
      actualTopMarginMm: topMargin,
      errors: [
        `Requested ${count} copies exceed the single-page A4 capacity of ${maxFittingCount} copies (${maxColumns} cols x ${maxRows} rows).`,
      ],
    };
  }

  // Calculate balanced columns and rows needed for requested copy count:
  // Determine minimum rows required, then distribute copies across those rows.
  const minRows = Math.ceil(count / maxColumns);
  const columns = Math.ceil(count / minRows);
  const rows = Math.ceil(count / columns);

  const requiredWidth = columns * w + (columns - 1) * spacingX;
  const requiredHeight = rows * h + (rows - 1) * spacingY;

  // Symmetrically center horizontally
  const actualLeftMargin = (sheet.widthMm - requiredWidth) / 2;
  const actualTopMargin = topMargin;

  const photos: PlacedPhoto[] = [];

  for (let i = 0; i < count; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = actualLeftMargin + col * (w + spacingX);
    const y = actualTopMargin + row * (h + spacingY);
    photos.push(createPlacedPhoto(i, x, y, w, h, cutGuideLength));
  }

  return {
    fits: true,
    copyCount: count,
    maxFittingCount,
    columns,
    rows,
    maxColumns,
    maxRows,
    requiredWidthMm: requiredWidth,
    requiredHeightMm: requiredHeight,
    availableWidthMm: availableWidth,
    availableHeightMm: availableHeight,
    photos,
    actualLeftMarginMm: actualLeftMargin,
    actualTopMarginMm: actualTopMargin,
  };
}

/**
 * Calculates a complete, printable sheet layout (single-row or balanced grid).
 *
 * Guaranteed geometric properties:
 * - Operates entirely in physical millimeters.
 * - Symmetrically centers rows and grids horizontally within usable sheet area.
 * - Adheres strictly to sheet boundaries: no photo extends beyond the usable margins.
 * - Guarantees zero overlap between distinct photos.
 * - Deterministic row-major ordering.
 * - Handles exact-fit boundary conditions cleanly with sub-micron epsilon tolerance (0.1 micron).
 * - Generates exact cutting guides for each placed photo.
 */
export function calculateSheetLayout(
  settings: SheetLayoutSettings,
  photoDimensions: PhotoDimensions
): SheetLayoutResult {
  const validation = validateSheetLayoutSettings(settings, photoDimensions);

  const sheet = settings?.sheetDimensions ?? A4_SHEET_DIMENSIONS_MM;
  const margins = settings?.margins ?? DEFAULT_PAGE_MARGINS_MM;
  const gaps = settings?.gaps ?? DEFAULT_LAYOUT_GAPS_MM;
  const includeCutGuides = settings?.includeCutGuides ?? false;
  const cutGuideLength = includeCutGuides
    ? (settings?.cutGuideLengthMm ?? DEFAULT_CUT_GUIDE_LENGTH_MM)
    : 0;
  const mode: LayoutMode = settings?.layoutMode === 'grid' ? 'grid' : 'single-row';
  const count = typeof settings?.copyCount === 'number' && Number.isFinite(settings.copyCount)
    ? Math.max(0, Math.floor(settings.copyCount))
    : 0;

  const sheetW = typeof sheet?.widthMm === 'number' && Number.isFinite(sheet.widthMm) ? sheet.widthMm : 0;
  const sheetH = typeof sheet?.heightMm === 'number' && Number.isFinite(sheet.heightMm) ? sheet.heightMm : 0;

  const topM = typeof margins?.topMm === 'number' && Number.isFinite(margins.topMm) ? margins.topMm : 0;
  const botM = typeof margins?.bottomMm === 'number' && Number.isFinite(margins.bottomMm) ? margins.bottomMm : 0;
  const leftM = typeof margins?.leftMm === 'number' && Number.isFinite(margins.leftMm) ? margins.leftMm : 0;
  const rightM = typeof margins?.rightMm === 'number' && Number.isFinite(margins.rightMm) ? margins.rightMm : 0;

  const usableW = Math.max(0, sheetW - (leftM + rightM));
  const usableH = Math.max(0, sheetH - (topM + botM));

  const usableArea: UsableSheetArea = {
    originXMm: leftM,
    originYMm: topM,
    widthMm: usableW,
    heightMm: usableH,
  };

  // Structured validation failure
  if (!validation.valid) {
    return {
      success: false,
      fits: false,
      layoutMode: mode,
      sheetDimensions: sheet,
      usableArea,
      photoDimensions,
      requestedCount: count,
      placedCount: 0,
      maxFittingCount: 0,
      columns: 0,
      rows: 0,
      maxColumns: 0,
      maxRows: 0,
      requiredWidthMm: 0,
      requiredHeightMm: 0,
      actualLeftMarginMm: 0,
      actualTopMarginMm: 0,
      includeCutGuides,
      photos: [],
      errors: validation.errors,
    };
  }

  const w = photoDimensions.widthMm;
  const h = photoDimensions.heightMm;
  const gapX = gaps.horizontalMm;
  const gapY = gaps.verticalMm;

  if (mode === 'single-row') {
    // Single-row mode
    const maxColumns = usableW + EPSILON_MM >= w ? Math.floor((usableW + gapX + EPSILON_MM) / (w + gapX)) : 0;
    const maxRows = usableH + EPSILON_MM >= h ? 1 : 0;
    const maxFittingCount = maxRows > 0 ? maxColumns : 0;

    const requiredWidth = count * w + (count - 1) * gapX;
    const requiredHeight = h;

    if (maxFittingCount === 0 || count > maxFittingCount) {
      const reason = maxRows === 0
        ? `Photo height (${h} mm) exceeds usable sheet height (${usableH.toFixed(1)} mm).`
        : `Requested ${count} copies require ${requiredWidth.toFixed(1)} mm width, but usable width is only ${usableW.toFixed(1)} mm. Maximum fitting count in one row is ${maxFittingCount}.`;

      return {
        success: true,
        fits: false,
        layoutMode: 'single-row',
        sheetDimensions: sheet,
        usableArea,
        photoDimensions,
        requestedCount: count,
        placedCount: 0,
        maxFittingCount,
        columns: 0,
        rows: 0,
        maxColumns,
        maxRows,
        requiredWidthMm: requiredWidth,
        requiredHeightMm: requiredHeight,
        actualLeftMarginMm: 0,
        actualTopMarginMm: margins.topMm,
        includeCutGuides,
        photos: [],
        errors: [reason],
      };
    }

    // Horizontally centered within usable sheet area
    const actualLeftMargin = margins.leftMm + (usableW - requiredWidth) / 2;
    const actualTopMargin = margins.topMm;
    const photos: PlacedPhoto[] = [];

    for (let i = 0; i < count; i++) {
      const x = actualLeftMargin + i * (w + gapX);
      const y = actualTopMargin;
      photos.push(createPlacedPhoto(i, x, y, w, h, cutGuideLength));
    }

    return {
      success: true,
      fits: true,
      layoutMode: 'single-row',
      sheetDimensions: sheet,
      usableArea,
      photoDimensions,
      requestedCount: count,
      placedCount: count,
      maxFittingCount,
      columns: count,
      rows: 1,
      maxColumns,
      maxRows,
      requiredWidthMm: requiredWidth,
      requiredHeightMm: requiredHeight,
      actualLeftMarginMm: actualLeftMargin,
      actualTopMarginMm: actualTopMargin,
      includeCutGuides,
      photos,
      errors: [],
    };
  } else {
    // Balanced grid mode
    const maxColumns = usableW + EPSILON_MM >= w ? Math.floor((usableW + gapX + EPSILON_MM) / (w + gapX)) : 0;
    const maxRows = usableH + EPSILON_MM >= h ? Math.floor((usableH + gapY + EPSILON_MM) / (h + gapY)) : 0;
    const maxFittingCount = maxColumns * maxRows;

    if (maxFittingCount === 0 || count > maxFittingCount) {
      return {
        success: true,
        fits: false,
        layoutMode: 'grid',
        sheetDimensions: sheet,
        usableArea,
        photoDimensions,
        requestedCount: count,
        placedCount: 0,
        maxFittingCount,
        columns: 0,
        rows: 0,
        maxColumns,
        maxRows,
        requiredWidthMm: 0,
        requiredHeightMm: 0,
        actualLeftMarginMm: 0,
        actualTopMarginMm: margins.topMm,
        includeCutGuides,
        photos: [],
        errors: [
          `Requested ${count} copies exceed the single-page capacity of ${maxFittingCount} copies (${maxColumns} cols x ${maxRows} rows).`,
        ],
      };
    }

    // Balanced Column Distribution:
    // Determine minimum rows required, then distribute copies across those rows.
    const minRows = Math.ceil(count / maxColumns);
    const columns = Math.ceil(count / minRows);
    const rows = Math.ceil(count / columns);

    const requiredWidth = columns * w + (columns - 1) * gapX;
    const requiredHeight = rows * h + (rows - 1) * gapY;

    // Symmetrically center horizontally within usable width
    const actualLeftMargin = margins.leftMm + (usableW - requiredWidth) / 2;
    const actualTopMargin = margins.topMm;

    const photos: PlacedPhoto[] = [];

    for (let i = 0; i < count; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const x = actualLeftMargin + col * (w + gapX);
      const y = actualTopMargin + row * (h + gapY);
      photos.push(createPlacedPhoto(i, x, y, w, h, cutGuideLength));
    }

    return {
      success: true,
      fits: true,
      layoutMode: 'grid',
      sheetDimensions: sheet,
      usableArea,
      photoDimensions,
      requestedCount: count,
      placedCount: count,
      maxFittingCount,
      columns,
      rows,
      maxColumns,
      maxRows,
      requiredWidthMm: requiredWidth,
      requiredHeightMm: requiredHeight,
      actualLeftMarginMm: actualLeftMargin,
      actualTopMarginMm: actualTopMargin,
      includeCutGuides,
      photos,
      errors: [],
    };
  }
}

