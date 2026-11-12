import React, { useState, useEffect, useRef } from 'react';
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
  const [showCalibrationRuler, setShowCalibrationRuler] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isInspectOpen, setIsInspectOpen] = useState<boolean>(false);

  const inspectTriggerRef = useRef<HTMLButtonElement>(null);
  const inspectCloseBtnRef = useRef<HTMLButtonElement>(null);
  const inspectDialogRef = useRef<HTMLDivElement>(null);

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

  // Validate selected photo index against current layout photos
  const selectedPhoto =
    selectedPhotoIndex !== null && selectedPhotoIndex < layoutResult.photos.length
      ? layoutResult.photos[selectedPhotoIndex]
      : null;

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

  // Inspect Modal accessibility & keyboard handlers
  useEffect(() => {
    if (!isInspectOpen) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;

    // Focus close button on open
    const focusTimer = setTimeout(() => {
      inspectCloseBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsInspectOpen(false);
      } else if (e.key === 'Tab' && inspectDialogRef.current) {
        // Simple focus trap containment
        const focusableElements = inspectDialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (!firstElement || !lastElement) return;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Prevent background scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previousActiveElement?.focus?.();
    };
  }, [isInspectOpen]);

  return (
    <div className="w-full rounded-xl border border-[#E3E1DC] bg-white p-4 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] no-print">
      {/* Step Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E3E1DC] pb-3 sm:pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#393834]">
            A4 Sheet Layout &amp; Tiling
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#777570]">
            Arrange photo copies onto an A4 page ({A4_SHEET_DIMENSIONS_MM.widthMm} × {A4_SHEET_DIMENSIONS_MM.heightMm} mm) with exact physical placement.
          </p>
        </div>

        {/* Secondary Navigation Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onReCropPhoto}
            className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-[#E3E1DC] bg-white px-3 py-1.5 text-xs font-medium text-[#777570] hover:text-[#393834] hover:bg-[#FAF9F6] active:bg-[#F0EEEA] focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none touch-press shadow-xs"
          >
            Adjust Crop
          </button>
          <button
            type="button"
            onClick={onReplacePhoto}
            className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-[#E3E1DC] bg-white px-3 py-1.5 text-xs font-medium text-[#777570] hover:text-[#393834] hover:bg-[#FAF9F6] active:bg-[#F0EEEA] focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none touch-press shadow-xs"
          >
            Change Photo
          </button>
        </div>
      </div>

      {/* Main Responsive Layout:
          On mobile (< lg): Sheet Preview is first, directly beneath header!
          On desktop (>= lg): 2 columns (Controls on left, Sticky Preview on right)
      */}
      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Mobile Preview Hero (Shown on < lg screens near the top) */}
        <div className="flex flex-col items-center lg:hidden">
          <div className="w-full rounded-lg border border-[#E3E1DC] bg-[#FAF9F6] p-3.5 sm:p-5 flex flex-col items-center shadow-xs">
            {/* Preview Toolbar */}
            <div className="w-full flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#393834]">
                  Sheet Preview
                </span>
                <span className="text-[11px] font-mono tabular-nums text-[#55534F] bg-white border border-[#E3E1DC] rounded px-1.5 py-0.5 shadow-2xs">
                  {layoutResult.placedCount} {layoutResult.placedCount === 1 ? 'copy' : 'copies'}
                </span>
              </div>

              <button
                ref={inspectTriggerRef}
                type="button"
                onClick={() => setIsInspectOpen(true)}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#E3E1DC] bg-white px-2.5 py-1 text-xs font-medium text-[#393834] hover:bg-[#FAF9F6] touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none shadow-2xs"
                aria-label="Enlarge and inspect A4 sheet layout"
              >
                <svg className="h-3.5 w-3.5 text-[#55534F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
                <span>Inspect</span>
              </button>
            </div>

            {/* A4 Sheet Preview */}
            <div className="w-full max-w-[270px] sm:max-w-[340px]">
              <A4SheetPreview
                layoutResult={layoutResult}
                photoUrl={previewPhotoUrl}
                showCutGuides={showCutGuides}
                showCalibrationRuler={showCalibrationRuler}
                selectedPhotoIndex={selectedPhotoIndex}
                onSelectPhoto={setSelectedPhotoIndex}
              />
            </div>

            {/* Photo Selection Feedback Bar */}
            <div className="w-full mt-3 pt-3 border-t border-[#E3E1DC]">
              {selectedPhoto ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-[#E3E1DC] bg-white px-3 py-1.5 text-xs text-[#393834] shadow-2xs animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="h-2 w-2 rounded-full bg-[#55534F] shrink-0" />
                    <span className="truncate">
                      <strong>Photo #{selectedPhoto.index + 1}</strong>: {selectedPhoto.widthMm.toFixed(1)} × {selectedPhoto.heightMm.toFixed(1)} mm
                    </span>
                    <span className="text-[#777570] font-mono tabular-nums text-[11px] shrink-0">
                      (X: {selectedPhoto.xMm.toFixed(1)}, Y: {selectedPhoto.yMm.toFixed(1)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPhotoIndex(null)}
                    className="shrink-0 text-[#777570] hover:text-[#393834] text-xs font-semibold px-1 py-0.5 rounded focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none"
                    aria-label="Clear photo selection"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <p className="text-center text-xs text-[#777570]">
                  Tap any photo on the sheet to inspect its physical print position.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Controls Column (7 cols on lg) */}
        <div className="flex flex-col gap-4 lg:col-span-7">
          {/* 1. Arrangement Mode Selector */}
          <div className="rounded-lg border border-[#E3E1DC] bg-[#FAF9F6] p-3.5 sm:p-4 shadow-2xs">
            <label className="block text-xs font-semibold text-[#393834] mb-2">
              Arrangement Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setMode('single-row')}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all min-h-[58px] touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none ${
                  mode === 'single-row'
                    ? 'border-[#55534F] bg-white text-[#393834] font-semibold ring-2 ring-[#55534F]/20 shadow-xs'
                    : 'border-[#E3E1DC] bg-white text-[#777570] hover:text-[#393834] hover:bg-[#FAF9F6]'
                }`}
              >
                <span className="text-sm font-semibold text-[#393834]">Single Row</span>
                <span className="text-xs text-[#777570] font-normal mt-0.5">
                  Horizontal row across top of sheet
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode('grid')}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all min-h-[58px] touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none ${
                  mode === 'grid'
                    ? 'border-[#55534F] bg-white text-[#393834] font-semibold ring-2 ring-[#55534F]/20 shadow-xs'
                    : 'border-[#E3E1DC] bg-white text-[#777570] hover:text-[#393834] hover:bg-[#FAF9F6]'
                }`}
              >
                <span className="text-sm font-semibold text-[#393834]">Balanced Grid</span>
                <span className="text-xs text-[#777570] font-normal mt-0.5">
                  Evenly distributes copies in rows &amp; columns
                </span>
              </button>
            </div>
          </div>

          {/* 2. Number of Copies: Single Stepper & Clean Preset Chips */}
          <div className="rounded-lg border border-[#E3E1DC] bg-[#FAF9F6] p-3.5 sm:p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="copy-count-input" className="text-xs font-semibold text-[#393834]">
                Number of Copies
              </label>
              <span className="text-xs font-mono tabular-nums text-[#777570]">
                Max {maxCapacity} in this mode
              </span>
            </div>

            {/* Stepper Control and Preset Chips */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Stepper Buttons and Input */}
              <div className="inline-flex items-center rounded-lg border border-[#E3E1DC] bg-white shadow-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={copyCount <= 1}
                  className="flex h-11 w-11 items-center justify-center rounded-l-lg text-lg font-bold text-[#393834] hover:bg-[#FAF9F6] disabled:opacity-30 disabled:pointer-events-none touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none"
                  aria-label="Decrease copies"
                >
                  −
                </button>
                <input
                  id="copy-count-input"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={200}
                  value={copyCount}
                  onChange={handleCopyCountChange}
                  className="h-11 w-16 border-x border-[#E3E1DC] text-center font-mono text-base font-bold text-[#393834] tabular-nums focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={copyCount >= 200}
                  className="flex h-11 w-11 items-center justify-center rounded-r-lg text-lg font-bold text-[#393834] hover:bg-[#FAF9F6] disabled:opacity-30 disabled:pointer-events-none touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none"
                  aria-label="Increase copies"
                >
                  +
                </button>
              </div>

              {/* Clean Preset Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Reference 6 */}
                <button
                  type="button"
                  onClick={() => setCopyCount(6)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none ${
                    copyCount === 6
                      ? 'bg-[#55534F] text-white shadow-xs'
                      : 'border border-[#E3E1DC] bg-white text-[#393834] hover:bg-[#FAF9F6]'
                  }`}
                >
                  6 Copies
                </button>

                {/* 8 Copies */}
                <button
                  type="button"
                  onClick={() => {
                    setMode('grid');
                    setCopyCount(8);
                  }}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none ${
                    copyCount === 8 && mode === 'grid'
                      ? 'bg-[#55534F] text-white shadow-xs'
                      : 'border border-[#E3E1DC] bg-white text-[#393834] hover:bg-[#FAF9F6]'
                  }`}
                >
                  8 Grid
                </button>

                {/* 12 Copies */}
                <button
                  type="button"
                  onClick={() => {
                    setMode('grid');
                    setCopyCount(12);
                  }}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none ${
                    copyCount === 12 && mode === 'grid'
                      ? 'bg-[#55534F] text-white shadow-xs'
                      : 'border border-[#E3E1DC] bg-white text-[#393834] hover:bg-[#FAF9F6]'
                  }`}
                >
                  12 Grid
                </button>

                {/* Max Fit */}
                <button
                  type="button"
                  onClick={() => {
                    setMode('grid');
                    setCopyCount(maxGridCapacity);
                  }}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none ${
                    copyCount === maxGridCapacity && mode === 'grid'
                      ? 'bg-[#55534F] text-white shadow-xs'
                      : 'border border-[#E3E1DC] bg-white text-[#393834] hover:bg-[#FAF9F6]'
                  }`}
                >
                  Fit Max ({maxGridCapacity})
                </button>
              </div>
            </div>
          </div>

          {/* 3. Feedback Banner / Actionable Capacity Warning */}
          {feedback.type === 'warning' && (
            <div className="rounded-lg border border-amber-300 bg-amber-50/90 p-3.5 sm:p-4 text-amber-950 shadow-xs">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900 text-xs font-bold mt-0.5">
                  !
                </span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-950">{feedback.title}</p>
                  <p className="mt-0.5 text-xs text-amber-900">{feedback.message}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {feedback.canSwitchToGrid && (
                      <button
                        type="button"
                        onClick={() => setMode('grid')}
                        className="inline-flex min-h-[36px] items-center rounded-lg bg-[#55534F] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#45433F] touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none"
                      >
                        Switch to Balanced Grid
                      </button>
                    )}
                    {feedback.suggestedMaxCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setCopyCount(feedback.suggestedMaxCount)}
                        className="inline-flex min-h-[36px] items-center rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-100/60 touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none"
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
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-emerald-950 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  ✓
                </span>
                <div>
                  <p className="text-xs font-semibold text-emerald-950">{feedback.title}</p>
                  <p className="text-xs text-emerald-800">{feedback.message}</p>
                </div>
              </div>

              <span className="text-[11px] font-mono tabular-nums font-semibold text-emerald-900 bg-emerald-100/80 px-2 py-0.5 rounded">
                {layoutResult.requiredWidthMm.toFixed(1)} × {layoutResult.requiredHeightMm.toFixed(1)} mm used
              </span>
            </div>
          )}

          {/* 4. Collapsible Advanced Settings (Margins & Gaps) */}
          <div className="rounded-lg border border-[#E3E1DC] bg-white shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between p-3.5 text-left text-xs font-semibold text-[#393834] hover:bg-[#FAF9F6] touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none min-h-[44px]"
              aria-expanded={showAdvanced}
            >
              <span className="flex items-center gap-2">
                <span>Page Margins, Spacing &amp; Cut Marks</span>
                <span className="rounded bg-[#FAF9F6] border border-[#E3E1DC] px-1.5 py-0.5 text-[10px] font-normal text-[#777570]">
                  Optional
                </span>
              </span>
              <span className="text-[#777570] text-xs font-semibold">
                {showAdvanced ? 'Hide ▲' : 'Customize ▼'}
              </span>
            </button>

            {showAdvanced && (
              <div className="border-t border-[#E3E1DC] p-4 flex flex-col gap-4 bg-[#FAF9F6]">
                {/* Cut Guides Checkbox */}
                <div className="flex items-center gap-2.5">
                  <input
                    id="cut-guides-checkbox"
                    type="checkbox"
                    checked={showCutGuides}
                    onChange={(e) => setShowCutGuides(e.target.checked)}
                    className="h-4 w-4 rounded border-[#E3E1DC] accent-[#55534F] focus:ring-[#55534F]"
                  />
                  <label htmlFor="cut-guides-checkbox" className="text-xs font-medium text-[#393834] cursor-pointer">
                    Include Corner Cutting Guides (Scissors / Trimmer ticks)
                  </label>
                </div>

                {/* Calibration Ruler Checkbox */}
                <div className="flex items-center gap-2.5">
                  <input
                    id="calibration-ruler-checkbox"
                    type="checkbox"
                    checked={showCalibrationRuler}
                    onChange={(e) => setShowCalibrationRuler(e.target.checked)}
                    className="h-4 w-4 rounded border-[#E3E1DC] accent-[#55534F] focus:ring-[#55534F]"
                  />
                  <label htmlFor="calibration-ruler-checkbox" className="text-xs font-medium text-[#393834] cursor-pointer">
                    Include 50 mm Calibration Ruler (Verify 100% scale at bottom)
                  </label>
                </div>

                {/* Page Margins (mm) */}
                <div>
                  <label className="block text-xs font-semibold text-[#393834] mb-1.5">
                    Page Margins (mm)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-[10px] text-[#777570]">Top</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        value={margins.topMm}
                        onChange={(e) =>
                          setMargins({ ...margins, topMm: Math.max(0, parseFloat(e.target.value) || 0) })
                        }
                        className="h-9 w-full rounded-md border border-[#E3E1DC] bg-white px-2 font-mono text-xs tabular-nums text-[#393834] focus:border-[#55534F] focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#777570]">Bottom</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        value={margins.bottomMm}
                        onChange={(e) =>
                          setMargins({ ...margins, bottomMm: Math.max(0, parseFloat(e.target.value) || 0) })
                        }
                        className="h-9 w-full rounded-md border border-[#E3E1DC] bg-white px-2 font-mono text-xs tabular-nums text-[#393834] focus:border-[#55534F] focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#777570]">Left</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        value={margins.leftMm}
                        onChange={(e) =>
                          setMargins({ ...margins, leftMm: Math.max(0, parseFloat(e.target.value) || 0) })
                        }
                        className="h-9 w-full rounded-md border border-[#E3E1DC] bg-white px-2 font-mono text-xs tabular-nums text-[#393834] focus:border-[#55534F] focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#777570]">Right</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        value={margins.rightMm}
                        onChange={(e) =>
                          setMargins({ ...margins, rightMm: Math.max(0, parseFloat(e.target.value) || 0) })
                        }
                        className="h-9 w-full rounded-md border border-[#E3E1DC] bg-white px-2 font-mono text-xs tabular-nums text-[#393834] focus:border-[#55534F] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Spacing Gaps (mm) */}
                <div>
                  <label className="block text-xs font-semibold text-[#393834] mb-1.5">
                    Photo Gaps (mm)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-[#777570]">Horizontal Gap</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={50}
                        value={gaps.horizontalMm}
                        onChange={(e) =>
                          setGaps({ ...gaps, horizontalMm: Math.max(0, parseFloat(e.target.value) || 0) })
                        }
                        className="h-9 w-full rounded-md border border-[#E3E1DC] bg-white px-2 font-mono text-xs tabular-nums text-[#393834] focus:border-[#55534F] focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#777570]">Vertical Gap</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={50}
                        value={gaps.verticalMm}
                        onChange={(e) =>
                          setGaps({ ...gaps, verticalMm: Math.max(0, parseFloat(e.target.value) || 0) })
                        }
                        className="h-9 w-full rounded-md border border-[#E3E1DC] bg-white px-2 font-mono text-xs tabular-nums text-[#393834] focus:border-[#55534F] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleResetMargins}
                    className="text-xs text-[#55534F] hover:text-[#393834] underline font-medium touch-press"
                  >
                    Reset to Standard Defaults
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 5. Summary Info Pill Box */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#55534F] bg-[#FAF9F6] p-3 rounded-lg border border-[#E3E1DC] font-mono tabular-nums shadow-2xs">
            <span>Photo: <strong className="text-[#393834]">{photoDimensions.widthMm.toFixed(1)} × {photoDimensions.heightMm.toFixed(1)} mm</strong></span>
            <span>•</span>
            <span>Sheet: <strong className="text-[#393834]">A4 (210 × 297 mm)</strong></span>
            <span>•</span>
            <span>Grid: <strong className="text-[#393834]">{layoutResult.rows}R × {layoutResult.columns}C</strong></span>
          </div>

          {/* 6. Step Action Buttons (Desktop placement) */}
          <div className="mt-2 hidden lg:flex items-center justify-between gap-3 border-t border-[#E3E1DC] pt-4">
            <button
              type="button"
              onClick={onBackToDimensions}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#E3E1DC] bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#393834] hover:bg-[#FAF9F6] active:bg-[#F0EEEA] touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none shadow-xs"
            >
              Back to Dimensions
            </button>

            <button
              type="button"
              disabled={!layoutResult.fits || !layoutResult.success}
              onClick={() => onProceedToExport(currentSettings, layoutResult)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#55534F] hover:bg-[#45433F] active:bg-[#383633] px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] disabled:opacity-40 disabled:pointer-events-none touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Continue to Export &amp; Print
            </button>
          </div>
        </div>

        {/* Right Column: Desktop A4 Sheet Preview (5 cols on lg, sticky) */}
        <div className="hidden lg:flex flex-col items-center justify-start lg:col-span-5 bg-[#FAF9F6] p-5 rounded-xl border border-[#E3E1DC] shadow-xs self-start sticky top-4">
          <div className="w-full flex items-center justify-between mb-3 px-1">
            <div className="text-left">
              <h3 className="text-xs font-semibold text-[#393834]">
                A4 Sheet Preview
              </h3>
              <p className="text-[11px] text-[#777570]">
                Physical 1:1 scale placement
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsInspectOpen(true)}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#E3E1DC] bg-white px-2.5 py-1 text-xs font-medium text-[#393834] hover:bg-[#FAF9F6] touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none shadow-2xs"
              aria-label="Enlarge and inspect A4 sheet layout"
            >
              <svg className="h-3.5 w-3.5 text-[#55534F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
              <span>Inspect</span>
            </button>
          </div>

          <div className="w-full max-w-[360px]">
            <A4SheetPreview
              layoutResult={layoutResult}
              photoUrl={previewPhotoUrl}
              showCutGuides={showCutGuides}
              showCalibrationRuler={showCalibrationRuler}
              selectedPhotoIndex={selectedPhotoIndex}
              onSelectPhoto={setSelectedPhotoIndex}
            />
          </div>

          {/* Photo Selection Feedback Bar (Desktop) */}
          <div className="w-full mt-3 pt-3 border-t border-[#E3E1DC]">
            {selectedPhoto ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-[#E3E1DC] bg-white px-3 py-1.5 text-xs text-[#393834] shadow-2xs animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="h-2 w-2 rounded-full bg-[#55534F] shrink-0" />
                  <span className="truncate">
                    <strong>Photo #{selectedPhoto.index + 1}</strong>: {selectedPhoto.widthMm.toFixed(1)} × {selectedPhoto.heightMm.toFixed(1)} mm
                  </span>
                  <span className="text-[#777570] font-mono tabular-nums text-[11px] shrink-0">
                    (X: {selectedPhoto.xMm.toFixed(1)}, Y: {selectedPhoto.yMm.toFixed(1)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPhotoIndex(null)}
                  className="shrink-0 text-[#777570] hover:text-[#393834] text-xs font-semibold px-1 py-0.5 rounded focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none"
                  aria-label="Clear photo selection"
                >
                  ✕
                </button>
              </div>
            ) : (
              <p className="text-center text-xs text-[#777570]">
                Click any photo on the sheet to inspect its physical print position.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sticky / Docked Action Footer (Shown on < lg) */}
      <div className="mt-6 flex lg:hidden items-center justify-between gap-3 border-t border-[#E3E1DC] pt-4 safe-area-bottom">
        <button
          type="button"
          onClick={onBackToDimensions}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#E3E1DC] bg-white px-4 py-2.5 text-xs font-semibold text-[#393834] hover:bg-[#FAF9F6] active:bg-[#F0EEEA] touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none shadow-xs"
        >
          Back
        </button>

        <button
          type="button"
          disabled={!layoutResult.fits || !layoutResult.success}
          onClick={() => onProceedToExport(currentSettings, layoutResult)}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#55534F] hover:bg-[#45433F] active:bg-[#383633] px-6 py-2.5 text-xs font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] disabled:opacity-40 disabled:pointer-events-none touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Continue to Print &amp; PDF
        </button>
      </div>

      {/* Enlarged Sheet Inspection Modal */}
      {isInspectOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 no-print"
          onClick={() => setIsInspectOpen(false)}
          role="presentation"
        >
          <div
            ref={inspectDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="inspect-sheet-heading"
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col max-h-[92dvh] w-full max-w-xl rounded-xl bg-white shadow-2xl border border-[#E3E1DC] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E3E1DC] px-4 py-3 sm:px-5">
              <div>
                <h3 id="inspect-sheet-heading" className="text-sm font-semibold text-[#393834] sm:text-base">
                  A4 Sheet Inspection (1:1 Scale)
                </h3>
                <p className="text-xs text-[#777570] font-mono tabular-nums">
                  210 × 297 mm · {layoutResult.placedCount} {layoutResult.placedCount === 1 ? 'copy' : 'copies'} · {layoutResult.rows}R × {layoutResult.columns}C
                </p>
              </div>

              <button
                ref={inspectCloseBtnRef}
                type="button"
                onClick={() => setIsInspectOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[#777570] hover:bg-[#FAF9F6] hover:text-[#393834] touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none"
                aria-label="Close enlarged preview"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center bg-[#FAF9F6]">
              <div className="w-full max-w-[420px] sm:max-w-[460px]">
                <A4SheetPreview
                  layoutResult={layoutResult}
                  photoUrl={previewPhotoUrl}
                  showCutGuides={showCutGuides}
                  showCalibrationRuler={showCalibrationRuler}
                  selectedPhotoIndex={selectedPhotoIndex}
                  onSelectPhoto={setSelectedPhotoIndex}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[#E3E1DC] bg-white px-4 py-3 sm:px-5 flex items-center justify-between gap-3">
              <div className="text-xs text-[#777570] truncate">
                {selectedPhoto ? (
                  <span className="font-mono tabular-nums text-[#393834]">
                    <strong>Photo #{selectedPhoto.index + 1}</strong>: {selectedPhoto.widthMm.toFixed(1)} × {selectedPhoto.heightMm.toFixed(1)} mm (X: {selectedPhoto.xMm.toFixed(1)}, Y: {selectedPhoto.yMm.toFixed(1)})
                  </span>
                ) : (
                  <span>Click any photo to inspect exact coordinates</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsInspectOpen(false)}
                className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-[#E3E1DC] bg-white px-4 py-1.5 text-xs font-semibold text-[#393834] hover:bg-[#FAF9F6] touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none shadow-2xs shrink-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
