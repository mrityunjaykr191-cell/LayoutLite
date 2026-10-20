import {
  type SheetLayoutSettings,
  type SheetLayoutResult,
  type PhotoDimensions,
  type LayoutMode,
  type PageMargins,
  type LayoutGaps,
  DEFAULT_PAGE_MARGINS_MM,
  DEFAULT_LAYOUT_GAPS_MM,
  DEFAULT_CUT_GUIDE_LENGTH_MM,
  A4_SHEET_DIMENSIONS_MM,
  calculateSheetLayout,
} from '@passport-photo/shared';

export interface LayoutPresetOption {
  readonly id: string;
  readonly label: string;
  readonly count: number | 'max';
  readonly mode?: LayoutMode;
  readonly description: string;
}

/**
 * Common quick copy-count presets for user convenience.
 */
export const COMMON_LAYOUT_PRESETS: readonly LayoutPresetOption[] = Object.freeze([
  {
    id: 'preset-6-row',
    label: '6 Copies (Row)',
    count: 6,
    mode: 'single-row',
    description: 'Reference 1-row layout at top of page',
  },
  {
    id: 'preset-6-grid',
    label: '6 Copies (Grid)',
    count: 6,
    mode: 'grid',
    description: 'Balanced 3 × 2 grid',
  },
  {
    id: 'preset-8',
    label: '8 Copies',
    count: 8,
    mode: 'grid',
    description: 'Balanced 4 × 2 grid',
  },
  {
    id: 'preset-12',
    label: '12 Copies',
    count: 12,
    mode: 'grid',
    description: 'Compact 4 × 3 grid',
  },
  {
    id: 'preset-max',
    label: 'Max Fit',
    count: 'max',
    mode: 'grid',
    description: 'Fills single A4 sheet to capacity',
  },
]);

/**
 * Calculates the maximum copies that fit on an A4 sheet for a given mode and margins.
 */
export function calculateMaxCapacity(
  photoDimensions: PhotoDimensions,
  mode: LayoutMode,
  margins: PageMargins = DEFAULT_PAGE_MARGINS_MM,
  gaps: LayoutGaps = DEFAULT_LAYOUT_GAPS_MM
): number {
  const probeSettings: SheetLayoutSettings = {
    sheetDimensions: A4_SHEET_DIMENSIONS_MM,
    margins,
    gaps,
    layoutMode: mode,
    copyCount: 1, // probe with 1 copy to query maxFittingCount
    cutGuideLengthMm: DEFAULT_CUT_GUIDE_LENGTH_MM,
  };
  const result = calculateSheetLayout(probeSettings, photoDimensions);
  return result.maxFittingCount;
}

export interface LayoutFeedbackMessage {
  readonly type: 'success' | 'warning' | 'error';
  readonly title: string;
  readonly message: string;
  readonly canSwitchToGrid: boolean;
  readonly suggestedMaxCount: number;
}

/**
 * Generates user-friendly, actionable feedback based on the layout calculation result.
 */
export function getLayoutFeedback(
  result: SheetLayoutResult,
  photoDimensions: PhotoDimensions,
  currentMode: LayoutMode
): LayoutFeedbackMessage {
  if (!result.success) {
    return {
      type: 'error',
      title: 'Invalid Layout Configuration',
      message: result.errors[0] ?? 'Please check your margins and dimensions.',
      canSwitchToGrid: false,
      suggestedMaxCount: 0,
    };
  }

  if (!result.fits) {
    if (currentMode === 'single-row') {
      const maxRow = result.maxFittingCount;
      if (maxRow > 0) {
        return {
          type: 'warning',
          title: 'Single Row Capacity Exceeded',
          message: `Only ${maxRow} copies of this size (${photoDimensions.widthMm.toFixed(1)} × ${photoDimensions.heightMm.toFixed(1)} mm) fit across a single row. Reduce copies or switch to Balanced Grid.`,
          canSwitchToGrid: true,
          suggestedMaxCount: maxRow,
        };
      } else {
        return {
          type: 'warning',
          title: 'Photo Too Large for Row',
          message: `Photo dimensions exceed the usable sheet width. Please reduce photo size or page margins.`,
          canSwitchToGrid: false,
          suggestedMaxCount: 0,
        };
      }
    } else {
      // Grid mode overflow
      const maxGrid = result.maxFittingCount;
      return {
        type: 'warning',
        title: 'Sheet Capacity Exceeded',
        message: `An A4 sheet can hold at most ${maxGrid} copies of this size (${photoDimensions.widthMm.toFixed(1)} × ${photoDimensions.heightMm.toFixed(1)} mm) with current margins.`,
        canSwitchToGrid: false,
        suggestedMaxCount: maxGrid,
      };
    }
  }

  // Fits successfully!
  if (currentMode === 'single-row') {
    return {
      type: 'success',
      title: 'Layout Fits on A4 Sheet',
      message: `${result.placedCount} copies arranged horizontally in 1 row near the top of the page.`,
      canSwitchToGrid: false,
      suggestedMaxCount: result.maxFittingCount,
    };
  }

  return {
    type: 'success',
    title: 'Layout Fits on A4 Sheet',
    message: `${result.placedCount} copies arranged in a balanced ${result.rows} × ${result.columns} grid.`,
    canSwitchToGrid: false,
    suggestedMaxCount: result.maxFittingCount,
  };
}
