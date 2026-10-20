import React, { useState } from 'react';
import {
  type PhotoDimensions,
  type SheetLayoutSettings,
  type SheetLayoutResult,
  type LayoutMode,
  type PageMargins,
  type LayoutGaps,
  DEFAULT_LAYOUT_SETTINGS,
  DEFAULT_PAGE_MARGINS_MM,
  DEFAULT_LAYOUT_GAPS_MM,
  DEFAULT_CUT_GUIDE_LENGTH_MM,
  A4_SHEET_DIMENSIONS_MM,
  calculateSheetLayout,
} from '@passport-photo/shared';
import {
  COMMON_LAYOUT_PRESETS,
  calculateMaxCapacity,
  getLayoutFeedback,
} from '../utils/sheetLayoutControls';
import { A4SheetPreview } from './A4SheetPreview';

interface SheetLayoutStepProps {
  readonly photoDimensions: PhotoDimensions;
  readonly previewPhotoUrl: string;
  readonly initialSettings?: SheetLayoutSettings;
  readonly onBackToDimensions: () => void;
  readonly onProceedToExport: (finalSettings: SheetLayoutSettings, finalResult: SheetLayoutResult) => void;
  readonly onReCropPhoto: () => void;
  readonly onReplacePhoto: () => void;
}

export const SheetLayoutStep: React.FC<SheetLayoutStepProps> = ({
  photoDimensions,
  previewPhotoUrl,
  initialSettings,
  onBackToDimensions,
  onProceedToExport,
  onReCropPhoto,
  onReplacePhoto,
}) => {
  const [mode, setMode] = useState<LayoutMode>(initialSettings?.layoutMode ?? DEFAULT_LAYOUT_SETTINGS.layoutMode);
  const [copyCount, setCopyCount] = useState<number>(initialSettings?.copyCount ?? DEFAULT_LAYOUT_SETTINGS.copyCount);
  const [margins, setMargins] = useState<PageMargins>(initialSettings?.margins ?? DEFAULT_PAGE_MARGINS_MM);
  const [gaps, setGaps] = useState<LayoutGaps>(initialSettings?.gaps ?? DEFAULT_LAYOUT_GAPS_MM);
  const [showCutGuides, setShowCutGuides] = useState<boolean>(
    initialSettings?.includeCutGuides ?? DEFAULT_LAYOUT_SETTINGS.includeCutGuides ?? false
  );
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Compute live layout result using shared geometry engine
  const currentSettings: SheetLayoutSettings = {
    sheetDimensions: A4_SHEET_DIMENSIONS_MM,
    margins,
    gaps,
    layoutMode: mode,
    copyCount,
    cutGuideLengthMm: showCutGuides ? DEFAULT_CUT_GUIDE_LENGTH_MM : 0,
    includeCutGuides: showCutGuides,
  };

  const layoutResult = calculateSheetLayout(currentSettings, photoDimensions);
  const maxCapacity = calculateMaxCapacity(photoDimensions, mode, margins, gaps);
  const maxGridCapacity = calculateMaxCapacity(photoDimensions, 'grid', margins, gaps);
  const feedback = getLayoutFeedback(layoutResult, photoDimensions, mode);

  // Stepper handlers
  const handleDecrement = () => {
    if (copyCount > 1) {
      setCopyCount(copyCount - 1);
    }
  };

  const handleIncrement = () => {
    if (copyCount < 200) {
      setCopyCount(copyCount + 1);
    }
  };

  const handleCopyCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      setCopyCount(1);
    } else {
      setCopyCount(Math.min(200, Math.max(1, val)));
    }
  };

  const handleResetMargins = () => {
    setMargins(DEFAULT_PAGE_MARGINS_MM);
    setGaps(DEFAULT_LAYOUT_GAPS_MM);
  };

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-3.5 sm:p-6 shadow-xs">
      {/* Step Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] sm:text-xs font-bold text-white">
              6
            </span>
            <h2 className="text-base font-bold text-slate-900 sm:text-xl">
              A4 Sheet Layout &amp; Tiling
            </h2>
          </div>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-600">
            Arrange photo copies onto an A4 page ({A4_SHEET_DIMENSIONS_MM.widthMm} × {A4_SHEET_DIMENSIONS_MM.heightMm} mm) for printing.
          </p>
        </div>

        {/* Secondary Navigation Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onReCropPhoto}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Adjust Crop
          </button>
          <button
            type="button"
            onClick={onReplacePhoto}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Change Photo
          </button>
        </div>
      </div>

      {/* Main Two-Column Workspace */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Layout Controls (7 cols on lg) */}
        <div className="flex flex-col gap-5 lg:col-span-7">
          {/* 1. Layout Mode Switcher */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Arrangement Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('single-row')}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all min-h-[56px] focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  mode === 'single-row'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-semibold ring-1 ring-blue-600 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-bold">Single Row</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-100/80 text-blue-800">
                    Reference
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-normal mt-0.5">
                  Horizontal row across top of sheet
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode('grid')}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all min-h-[56px] focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  mode === 'grid'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-semibold ring-1 ring-blue-600 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-bold">Balanced Grid</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    Multi-Row
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-normal mt-0.5">
                  Evenly distributes copies in rows &amp; columns
                </span>
              </button>
            </div>
          </div>

          {/* 2. Copy Count Controls & Quick Presets */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="copy-count-input" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Number of Copies
              </label>
              <span className="text-xs font-mono text-slate-500">
                Max {maxCapacity} for this mode
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Stepper Buttons and Input */}
              <div className="flex items-center rounded-lg border border-slate-300 bg-white shadow-xs">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={copyCount <= 1}
                  className="flex h-11 w-11 items-center justify-center rounded-l-lg text-lg font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  aria-label="Decrease copies"
                >
                  −
                </button>
                <input
                  id="copy-count-input"
                  type="number"
                  min={1}
                  max={200}
                  value={copyCount}
                  onChange={handleCopyCountChange}
                  className="h-11 w-16 border-x border-slate-200 text-center font-mono text-base font-bold text-slate-900 focus:outline-none focus:bg-blue-50/30"
                />
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={copyCount >= 200}
                  className="flex h-11 w-11 items-center justify-center rounded-r-lg text-lg font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  aria-label="Increase copies"
                >
                  +
                </button>
              </div>

              {/* Presets Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {COMMON_LAYOUT_PRESETS.map((preset) => {
                  const targetCount = preset.count === 'max' ? maxGridCapacity : preset.count;
                  const isSelected = copyCount === targetCount && (!preset.mode || preset.mode === mode);

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        if (preset.mode) setMode(preset.mode);
                        setCopyCount(targetCount);
                      }}
                      className={`min-h-[38px] px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Feedback Banner / Actionable Warning */}
          {feedback.type === 'warning' && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-xs">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800 text-xs font-bold mt-0.5">
                  !
                </span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-900">{feedback.title}</p>
                  <p className="mt-0.5 text-xs text-amber-800">{feedback.message}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {feedback.canSwitchToGrid && (
                      <button
                        type="button"
                        onClick={() => setMode('grid')}
                        className="inline-flex min-h-[36px] items-center rounded-md bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 focus-visible:ring-2 focus-visible:ring-amber-600"
                      >
                        Switch to Balanced Grid
                      </button>
                    )}
                    {feedback.suggestedMaxCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setCopyCount(feedback.suggestedMaxCount)}
                        className="inline-flex min-h-[36px] items-center rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100/60 focus-visible:ring-2 focus-visible:ring-amber-600"
                      >
                        Fit {feedback.suggestedMaxCount} copies in {mode === 'single-row' ? '1 row' : 'grid'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {feedback.type === 'success' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3.5 text-emerald-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                  ✓
                </span>
                <div>
                  <p className="text-xs font-bold text-emerald-900">{feedback.title}</p>
                  <p className="text-xs text-emerald-700">{feedback.message}</p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                {layoutResult.requiredWidthMm.toFixed(1)} × {layoutResult.requiredHeightMm.toFixed(1)} mm used
              </span>
            </div>
          )}

          {/* 4. Collapsible Advanced Settings (Margins & Gaps) */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between p-3.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg min-h-[44px]"
            >
              <span className="flex items-center gap-2">
                <span>Page Margins, Spacing &amp; Cut Marks</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-500">
                  Optional
                </span>
              </span>
              <span className="text-slate-400">{showAdvanced ? '▲ Hide' : '▼ Customize'}</span>
            </button>

            {showAdvanced && (
              <div className="border-t border-slate-100 p-4 flex flex-col gap-4">
                {/* Cut Guides Checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    id="cut-guides-checkbox"
                    type="checkbox"
                    checked={showCutGuides}
                    onChange={(e) => setShowCutGuides(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="cut-guides-checkbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Include Cutting Guides (Corner Ticks)
                  </label>
                </div>

                {/* Page Margins (mm) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Page Margins (mm)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500">Top</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={margins.topMm}
                        onChange={(e) =>
                          setMargins({ ...margins, topMm: Math.max(0, parseFloat(e.target.value) || 0) })
                        }
                        className="h-9 w-full rounded border border-slate-300 px-2 font-mono text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Bottom</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={margins.bottomMm}
                        onChange={(e) =>
                          setMargins({ ...margins, bottomMm: Math.max(0, parseFloat(e.target.value) || 0) })
                        }
                        className="h-9 w-full rounded border border-slate-300 px-2 font-mono text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Left</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={margins.leftMm}
                        onChange={(e) =>
                          setMargins({ ...margins, leftMm: Math.max(0, parseFloat(e.target.value) || 0) })
                        }
                        className="h-9 w-full rounded border border-slate-300 px-2 font-mono text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Right</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={margins.rightMm}
                        onChange={(e) =>
                          setMargins({ ...margins, rightMm: Math.max(0, parseFloat(e.target.value) || 0) })
                        }
                        className="h-9 w-full rounded border border-slate-300 px-2 font-mono text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Spacing Gaps (mm) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Photo Gaps (mm)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500">Horizontal Gap</span>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={gaps.horizontalMm}
                        onChange={(e) =>
                          setGaps({ ...gaps, horizontalMm: Math.max(0, parseFloat(e.target.value) || 0) })
                        }
                        className="h-9 w-full rounded border border-slate-300 px-2 font-mono text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Vertical Gap</span>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={gaps.verticalMm}
                        onChange={(e) =>
                          setGaps({ ...gaps, verticalMm: Math.max(0, parseFloat(e.target.value) || 0) })
                        }
                        className="h-9 w-full rounded border border-slate-300 px-2 font-mono text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleResetMargins}
                    className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    Reset to Standard Defaults
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 5. Summary Info Pill Box */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono">
            <span>Photo: <strong className="text-slate-800">{photoDimensions.widthMm.toFixed(1)} × {photoDimensions.heightMm.toFixed(1)} mm</strong></span>
            <span>•</span>
            <span>Sheet: <strong className="text-slate-800">A4 (210 × 297 mm)</strong></span>
            <span>•</span>
            <span>Layout: <strong className="text-slate-800">{layoutResult.rows}R × {layoutResult.columns}C</strong></span>
          </div>

          {/* 6. Step Action Buttons */}
          <div className="mt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onBackToDimensions}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Back to Dimensions
            </button>

            <button
              type="button"
              disabled={!layoutResult.fits || !layoutResult.success}
              onClick={() => onProceedToExport(currentSettings, layoutResult)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Continue to Export &amp; Print
            </button>
          </div>
        </div>

        {/* Right Column: Interactive A4 Sheet Preview (5 cols on lg) */}
        <div className="flex flex-col items-center justify-start lg:col-span-5 bg-slate-50/70 p-4 sm:p-6 rounded-xl border border-slate-200">
          <div className="mb-3 text-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              A4 Sheet Preview (Physical 1:1 Scale)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Exact paper placement as it will print on an A4 sheet
            </p>
          </div>

          <A4SheetPreview
            layoutResult={layoutResult}
            photoUrl={previewPhotoUrl}
            showCutGuides={showCutGuides}
          />
        </div>
      </div>
    </div>
  );
};
