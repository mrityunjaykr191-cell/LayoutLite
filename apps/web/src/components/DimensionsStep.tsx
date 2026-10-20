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
    description: 'Provisional starting size — standard small portrait',
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
      description: 'Provisional starting size',
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
    <div className="w-full rounded-xl border border-slate-200 bg-white p-3.5 sm:p-6 shadow-xs">
      {/* Step Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] sm:text-xs font-bold text-white">
              5
            </span>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Physical Photo Dimensions
            </h2>
            {isProvisionalDefault && (
              <span className="hidden sm:inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200">
                Default Size
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Set the exact physical print dimensions for your photo in millimeters or inches.
          </p>
        </div>

        {/* Unit Toggle Switch */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleUnitToggle('mm')}
            className={`min-h-[36px] min-w-[44px] rounded-md px-3 py-1 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-blue-600 ${
              unit === 'mm'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            aria-pressed={unit === 'mm'}
          >
            Millimeters (mm)
          </button>
          <button
            type="button"
            onClick={() => handleUnitToggle('in')}
            className={`min-h-[36px] min-w-[44px] rounded-md px-3 py-1 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-blue-600 ${
              unit === 'in'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
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
        <div className="md:col-span-5 flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-4 min-h-[300px]">
          <div className="relative max-h-[300px] max-w-full overflow-hidden rounded-md shadow-xs bg-white">
            <img
              src={previewPhotoUrl}
              alt="Portrait print preview"
              className="max-h-[280px] max-w-full object-contain rounded-md"
              style={{
                outline: '1px solid rgba(0, 0, 0, 0.1)',
                outlineOffset: '-1px',
              }}
            />
          </div>

          {/* Physical Size Overlay Pill */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-slate-700">
            <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 shadow-xs">
              <span className="font-sans text-slate-400 mr-1.5 font-normal">Print Size:</span>
              <span className="font-bold text-slate-900">{activeWidthMm.toFixed(1)} × {activeHeightMm.toFixed(1)} mm</span>
              <span className="text-slate-400 ml-1">({activeWidthIn} × {activeHeightIn} in)</span>
            </span>
            <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 shadow-xs">
              <span className="font-sans text-slate-400 mr-1 font-normal">Background:</span>
              <span className="font-semibold text-slate-800">
                {isBackgroundSkipped ? 'Original' : selectedColorHex}
              </span>
            </span>
          </div>

          <p className="mt-1 text-[11px] text-slate-500 font-mono">
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
                  <label htmlFor="photo-width-input" className="block text-xs font-bold text-slate-800">
                    Width ({unit})
                  </label>
                  <div className="mt-1.5 relative">
                    <input
                      type="number"
                      id="photo-width-input"
                      step={unit === 'mm' ? '0.5' : '0.01'}
                      min={unit === 'mm' ? MIN_PHOTO_DIMENSION_MM : mmToInches(MIN_PHOTO_DIMENSION_MM)}
                      max={unit === 'mm' ? MAX_PHOTO_DIMENSION_MM : mmToInches(MAX_PHOTO_DIMENSION_MM)}
                      value={widthInput}
                      onChange={handleWidthChange}
                      aria-invalid={Boolean(validation.widthError)}
                      aria-describedby={validation.widthError ? 'width-error-msg' : undefined}
                      className={`w-full min-h-[44px] rounded-lg border bg-white px-3 py-2 font-mono text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600 ${
                        validation.widthError
                          ? 'border-red-400 focus-visible:border-red-500 ring-1 ring-red-300'
                          : 'border-slate-300'
                      }`}
                    />
                    <span className="absolute right-3 top-3 text-xs font-bold text-slate-400 pointer-events-none">
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
                  <label htmlFor="photo-height-input" className="block text-xs font-bold text-slate-800">
                    Height ({unit})
                  </label>
                  <div className="mt-1.5 relative">
                    <input
                      type="number"
                      id="photo-height-input"
                      step={unit === 'mm' ? '0.5' : '0.01'}
                      min={unit === 'mm' ? MIN_PHOTO_DIMENSION_MM : mmToInches(MIN_PHOTO_DIMENSION_MM)}
                      max={unit === 'mm' ? MAX_PHOTO_DIMENSION_MM : mmToInches(MAX_PHOTO_DIMENSION_MM)}
                      value={heightInput}
                      onChange={handleHeightChange}
                      aria-invalid={Boolean(validation.heightError)}
                      aria-describedby={validation.heightError ? 'height-error-msg' : undefined}
                      className={`w-full min-h-[44px] rounded-lg border bg-white px-3 py-2 font-mono text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600 ${
                        validation.heightError
                          ? 'border-red-400 focus-visible:border-red-500 ring-1 ring-red-300'
                          : 'border-slate-300'
                      }`}
                    />
                    <span className="absolute right-3 top-3 text-xs font-bold text-slate-400 pointer-events-none">
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
              <p className="mt-1.5 text-[11px] text-slate-500">
                Allowed physical range: {MIN_PHOTO_DIMENSION_MM} mm to {MAX_PHOTO_DIMENSION_MM} mm{' '}
                ({mmToInches(MIN_PHOTO_DIMENSION_MM).toFixed(2)} in – {mmToInches(MAX_PHOTO_DIMENSION_MM).toFixed(2)} in).
              </p>
            </div>

            {/* Quick Common Dimensions Buttons */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Common Dimensions
                </span>
                {!isProvisionalDefault && (
                  <button
                    type="button"
                    onClick={handleResetToProvisional}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Reset to 35 × 45 mm
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Quick convenience formats. Check your specific form guidelines for required measurements.
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
                      className={`flex min-h-[44px] flex-col justify-center rounded-lg border p-2.5 text-left transition-all focus-visible:ring-2 focus-visible:ring-blue-600 ${
                        isCurrent
                          ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600 font-semibold'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900">{opt.label}</span>
                      <span className="text-[10px] text-slate-500 leading-tight truncate">{opt.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onProceedToSheetLayout}
              disabled={!validation.isValid}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
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
                className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 active:scale-[0.98]"
              >
                <span>{isBackgroundSkipped ? 'Back' : 'Back to Color'}</span>
              </button>

              <button
                type="button"
                onClick={onReCropPhoto}
                className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 active:scale-[0.98]"
              >
                Re-Crop
              </button>

              <button
                type="button"
                onClick={onReplacePhoto}
                className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 active:scale-[0.98]"
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
