import React, { useState } from 'react';
import {
  type PhotoDimensions,
  PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS,
  MIN_PHOTO_DIMENSION_MM,
  MAX_PHOTO_DIMENSION_MM,
  mmToInches,
} from '@passport-photo/shared';
import {
  DimensionUnit,
  formatDimensionValue,
  validateDimensionInputs,
  formatAspectRatioDisplay,
} from '../utils/dimensionControls';

interface DimensionsStepProps {
  readonly currentDimensions: PhotoDimensions;
  readonly previewPhotoUrl: string;
  readonly selectedColorHex: string;
  readonly isBackgroundSkipped: boolean;
  readonly onDimensionsChange: (newDimensions: PhotoDimensions) => void;
  readonly onBackToPreviousStep: () => void;
  readonly onProceedToSheetLayout: () => void;
  readonly onReCropPhoto: () => void;
  readonly onReplacePhoto: () => void;
}

// Neutral common dimensions for quick convenience without country compliance claims
interface QuickSizeOption {
  readonly label: string;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly description: string;
}

const COMMON_SIZE_OPTIONS: readonly QuickSizeOption[] = Object.freeze([
  {
    label: '35 × 45 mm',
    widthMm: 35,
    heightMm: 45,
    description: 'Standard portrait format',
  },
  {
    label: '50.8 × 50.8 mm (2 × 2 in)',
    widthMm: 50.8,
    heightMm: 50.8,
    description: 'Common square format',
  },
  {
    label: '30 × 40 mm',
    widthMm: 30,
    heightMm: 40,
    description: 'Compact portrait format',
  },
  {
    label: '40 × 50 mm',
    widthMm: 40,
    heightMm: 50,
    description: 'Medium portrait format',
  },
]);

export const DimensionsStep: React.FC<DimensionsStepProps> = ({
  currentDimensions,
  previewPhotoUrl,
  selectedColorHex,
  isBackgroundSkipped,
  onDimensionsChange,
  onBackToPreviousStep,
  onProceedToSheetLayout,
  onReCropPhoto,
  onReplacePhoto,
}) => {
  const [unit, setUnit] = useState<DimensionUnit>(currentDimensions.unitPreference ?? 'mm');

  // Input field string values
  const [widthInput, setWidthInput] = useState<string>(
    formatDimensionValue(currentDimensions.widthMm, currentDimensions.unitPreference ?? 'mm')
  );
  const [heightInput, setHeightInput] = useState<string>(
    formatDimensionValue(currentDimensions.heightMm, currentDimensions.unitPreference ?? 'mm')
  );

  // Validate current inputs
  const validation = validateDimensionInputs(widthInput, heightInput, unit);

  // Handle unit toggle without changing physical millimeter dimensions
  const handleUnitToggle = (newUnit: DimensionUnit) => {
    if (newUnit === unit) return;

    if (validation.isValid && validation.parsedDimensions) {
      // Re-format current valid dimensions into new unit
      const newWidthStr = formatDimensionValue(validation.parsedDimensions.widthMm, newUnit);
      const newHeightStr = formatDimensionValue(validation.parsedDimensions.heightMm, newUnit);
      setWidthInput(newWidthStr);
      setHeightInput(newHeightStr);
      setUnit(newUnit);
      onDimensionsChange({
        widthMm: validation.parsedDimensions.widthMm,
        heightMm: validation.parsedDimensions.heightMm,
        unitPreference: newUnit,
      });
    } else {
      // In invalid state, convert existing underlying dimensions
      const newWidthStr = formatDimensionValue(currentDimensions.widthMm, newUnit);
      const newHeightStr = formatDimensionValue(currentDimensions.heightMm, newUnit);
      setWidthInput(newWidthStr);
      setHeightInput(newHeightStr);
      setUnit(newUnit);
    }
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setWidthInput(val);
    const result = validateDimensionInputs(val, heightInput, unit);
    if (result.isValid && result.parsedDimensions) {
      onDimensionsChange(result.parsedDimensions);
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHeightInput(val);
    const result = validateDimensionInputs(widthInput, val, unit);
    if (result.isValid && result.parsedDimensions) {
      onDimensionsChange(result.parsedDimensions);
    }
  };

  const handleApplyQuickSize = (option: QuickSizeOption) => {
    const newWidthStr = formatDimensionValue(option.widthMm, unit);
    const newHeightStr = formatDimensionValue(option.heightMm, unit);
    setWidthInput(newWidthStr);
    setHeightInput(newHeightStr);

    const newDims: PhotoDimensions = {
      widthMm: option.widthMm,
      heightMm: option.heightMm,
      unitPreference: unit,
    };
    onDimensionsChange(newDims);
  };

  const handleResetToProvisional = () => {
    handleApplyQuickSize({
      label: '35 × 45 mm',
      widthMm: PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS.widthMm,
      heightMm: PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS.heightMm,
      description: 'Standard portrait format',
    });
  };

  // Determine active physical values for display
  const activeWidthMm = validation.parsedDimensions?.widthMm ?? currentDimensions.widthMm;
  const activeHeightMm = validation.parsedDimensions?.heightMm ?? currentDimensions.heightMm;
  const activeWidthIn = mmToInches(activeWidthMm).toFixed(2);
  const activeHeightIn = mmToInches(activeHeightMm).toFixed(2);

  const isProvisionalDefault =
    Math.abs(activeWidthMm - PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS.widthMm) < 0.1 &&
    Math.abs(activeHeightMm - PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS.heightMm) < 0.1;

  return (
    <div className="w-full rounded-xl border border-[#E3E1DC] bg-white p-4 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Step Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#E3E1DC] pb-3 sm:pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#393834]">
              Physical Photo Dimensions
            </h2>
            {isProvisionalDefault && (
              <span className="hidden sm:inline-flex rounded-md bg-[#FAF9F6] px-2 py-0.5 text-xs font-medium text-[#777570] border border-[#E3E1DC]">
                Default 35 × 45 mm
              </span>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#777570]">
            Set the exact physical print dimensions for your portrait photo in millimeters or inches.
          </p>
        </div>

        {/* Unit Toggle Switch */}
        <div className="flex items-center gap-1 rounded-lg border border-[#E3E1DC] bg-[#FAF9F6] p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleUnitToggle('mm')}
            className={`min-h-[34px] min-w-[44px] rounded-md px-3 py-1 text-xs font-semibold transition-all touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none ${
              unit === 'mm'
                ? 'bg-white text-[#393834] shadow-xs'
                : 'text-[#777570] hover:text-[#393834]'
            }`}
            aria-pressed={unit === 'mm'}
          >
            Millimeters (mm)
          </button>
          <button
            type="button"
            onClick={() => handleUnitToggle('in')}
            className={`min-h-[34px] min-w-[44px] rounded-md px-3 py-1 text-xs font-semibold transition-all touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none ${
              unit === 'in'
                ? 'bg-white text-[#393834] shadow-xs'
                : 'text-[#777570] hover:text-[#393834]'
            }`}
            aria-pressed={unit === 'in'}
          >
            Inches (in)
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Preview Stage (md:col-span-5) */}
        <div className="md:col-span-5 flex flex-col items-center justify-center rounded-lg border border-[#E3E1DC] bg-[#FAF9F6] p-4 min-h-[260px] sm:min-h-[320px]">
          <div className="relative max-h-[280px] max-w-full overflow-hidden rounded-lg shadow-sm bg-white border border-[#E3E1DC]">
            <img
              src={previewPhotoUrl}
              alt="Portrait print preview"
              className="max-h-[260px] max-w-full object-contain rounded-lg"
            />
          </div>

          {/* Physical Size Overlay Pill */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs text-[#55534F]">
            <span className="rounded-md border border-[#E3E1DC] bg-white px-2.5 py-1 shadow-xs">
              <span className="text-[#777570] mr-1 text-[11px]">Print Size:</span>
              <span className="font-bold text-[#393834] font-mono tabular-nums">
                {activeWidthMm.toFixed(1)} × {activeHeightMm.toFixed(1)} mm
              </span>
              <span className="text-[#777570] ml-1 font-mono text-[11px] tabular-nums">
                ({activeWidthIn} × {activeHeightIn} in)
              </span>
            </span>
            <span className="rounded-md border border-[#E3E1DC] bg-white px-2 py-1 shadow-xs text-[11px]">
              <span className="text-[#777570] mr-1">Background:</span>
              <span className="font-medium text-[#393834]">
                {isBackgroundSkipped ? 'Original' : selectedColorHex}
              </span>
            </span>
          </div>

          <p className="mt-1 text-xs text-[#777570] font-mono tabular-nums">
            Aspect Ratio: {formatAspectRatioDisplay(activeWidthMm, activeHeightMm)}
          </p>
        </div>

        {/* Right Dimension Form Controls (md:col-span-7) */}
        <div className="md:col-span-7 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-4">
            {/* Dimension Numeric Input Fields */}
            <div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Width Input */}
                <div>
                  <label htmlFor="photo-width-input" className="block text-xs font-semibold text-[#393834]">
                    Width ({unit})
                  </label>
                  <div className="mt-1.5 relative">
                    <input
                      type="number"
                      id="photo-width-input"
                      inputMode="decimal"
                      step={unit === 'mm' ? '0.5' : '0.01'}
                      min={unit === 'mm' ? MIN_PHOTO_DIMENSION_MM : mmToInches(MIN_PHOTO_DIMENSION_MM)}
                      max={unit === 'mm' ? MAX_PHOTO_DIMENSION_MM : mmToInches(MAX_PHOTO_DIMENSION_MM)}
                      value={widthInput}
                      onChange={handleWidthChange}
                      aria-invalid={Boolean(validation.widthError)}
                      aria-describedby={validation.widthError ? 'width-error-msg' : undefined}
                      className={`w-full min-h-[44px] rounded-lg border bg-white px-3 py-2 font-mono text-sm font-semibold text-[#393834] tabular-nums focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none ${
                        validation.widthError
                          ? 'border-red-400 focus-visible:border-red-500 ring-1 ring-red-300'
                          : 'border-[#E3E1DC]'
                      }`}
                    />
                    <span className="absolute right-3 top-3 text-xs font-medium text-[#777570] pointer-events-none">
                      {unit}
                    </span>
                  </div>
                  {validation.widthError && (
                    <p id="width-error-msg" role="alert" className="mt-1 text-[11px] font-medium text-red-600">
                      {validation.widthError}
                    </p>
                  )}
                </div>

                {/* Height Input */}
                <div>
                  <label htmlFor="photo-height-input" className="block text-xs font-semibold text-[#393834]">
                    Height ({unit})
                  </label>
                  <div className="mt-1.5 relative">
                    <input
                      type="number"
                      id="photo-height-input"
                      inputMode="decimal"
                      step={unit === 'mm' ? '0.5' : '0.01'}
                      min={unit === 'mm' ? MIN_PHOTO_DIMENSION_MM : mmToInches(MIN_PHOTO_DIMENSION_MM)}
                      max={unit === 'mm' ? MAX_PHOTO_DIMENSION_MM : mmToInches(MAX_PHOTO_DIMENSION_MM)}
                      value={heightInput}
                      onChange={handleHeightChange}
                      aria-invalid={Boolean(validation.heightError)}
                      aria-describedby={validation.heightError ? 'height-error-msg' : undefined}
                      className={`w-full min-h-[44px] rounded-lg border bg-white px-3 py-2 font-mono text-sm font-semibold text-[#393834] tabular-nums focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none ${
                        validation.heightError
                          ? 'border-red-400 focus-visible:border-red-500 ring-1 ring-red-300'
                          : 'border-[#E3E1DC]'
                      }`}
                    />
                    <span className="absolute right-3 top-3 text-xs font-medium text-[#777570] pointer-events-none">
                      {unit}
                    </span>
                  </div>
                  {validation.heightError && (
                    <p id="height-error-msg" role="alert" className="mt-1 text-[11px] font-medium text-red-600">
                      {validation.heightError}
                    </p>
                  )}
                </div>
              </div>

              {/* Physical Bounds Guide */}
              <p className="mt-1.5 text-xs text-[#777570] tabular-nums">
                Allowed physical range: {MIN_PHOTO_DIMENSION_MM} – {MAX_PHOTO_DIMENSION_MM} mm{' '}
                ({mmToInches(MIN_PHOTO_DIMENSION_MM).toFixed(2)} – {mmToInches(MAX_PHOTO_DIMENSION_MM).toFixed(2)} in).
              </p>
            </div>

            {/* Quick Common Dimensions Buttons */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#393834]">
                  Common Dimensions
                </span>
                {!isProvisionalDefault && (
                  <button
                    type="button"
                    onClick={handleResetToProvisional}
                    className="text-xs font-medium text-[#55534F] hover:text-[#393834] underline touch-press"
                  >
                    Reset to 35 × 45 mm
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-xs text-[#777570]">
                Quick convenience formats for applications and cards:
              </p>

              <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-2">
                {COMMON_SIZE_OPTIONS.map((opt) => {
                  const isCurrent =
                    Math.abs(activeWidthMm - opt.widthMm) < 0.1 &&
                    Math.abs(activeHeightMm - opt.heightMm) < 0.1;

                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleApplyQuickSize(opt)}
                      className={`flex min-h-[44px] flex-col justify-center rounded-lg border p-2.5 text-left transition-all touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none ${
                        isCurrent
                          ? 'border-[#55534F] bg-[#FAF9F6] ring-2 ring-[#55534F]/20'
                          : 'border-[#E3E1DC] bg-white hover:border-[#D0CECA] hover:bg-[#FAF9F6]'
                      }`}
                    >
                      <span className="text-xs font-semibold text-[#393834] font-mono tabular-nums">{opt.label}</span>
                      <span className="text-[11px] text-[#777570] leading-tight truncate">{opt.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col gap-2.5 pt-3 border-t border-[#E3E1DC]">
            <button
              type="button"
              onClick={onProceedToSheetLayout}
              disabled={!validation.isValid}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#55534F] hover:bg-[#45433F] active:bg-[#383633] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed touch-press"
            >
              <span>Continue to Sheet Layout</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={onBackToPreviousStep}
                className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-[#E3E1DC] bg-white px-2 py-2 text-xs font-medium text-[#393834] hover:bg-[#FAF9F6] active:bg-[#F0EEEA] focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none touch-press"
              >
                <span>{isBackgroundSkipped ? 'Back' : 'Back to Color'}</span>
              </button>

              <button
                type="button"
                onClick={onReCropPhoto}
                className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-[#E3E1DC] bg-white px-2 py-2 text-xs font-medium text-[#777570] hover:text-[#393834] hover:bg-[#FAF9F6] active:bg-[#F0EEEA] focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none touch-press"
              >
                Re-Crop
              </button>

              <button
                type="button"
                onClick={onReplacePhoto}
                className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-[#E3E1DC] bg-white px-2 py-2 text-xs font-medium text-[#777570] hover:text-[#393834] hover:bg-[#FAF9F6] active:bg-[#F0EEEA] focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none touch-press"
              >
                Change Photo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
