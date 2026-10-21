import React, { useState, useEffect, useRef } from 'react';
import {
  type PhotoDimensions,
  type SheetLayoutResult,
} from '@passport-photo/shared';
import { A4SheetPreview } from './A4SheetPreview';
import { PrePrintWarningModal } from './PrePrintWarningModal';
import { generatePrintReadyPdf, triggerFileDownload } from '../services/pdfGenerator';

interface ExportPrintStepProps {
  readonly photoDimensions: PhotoDimensions;
  readonly layoutResult: SheetLayoutResult;
  readonly previewPhotoUrl: string;
  readonly photoBlob: Blob;
  readonly onBackToLayout: () => void;
  readonly onAdjustDimensions: () => void;
  readonly onStartOver: () => void;
}

export const ExportPrintStep: React.FC<ExportPrintStepProps> = ({
  photoDimensions,
  layoutResult,
  previewPhotoUrl,
  photoBlob,
  onBackToLayout,
  onAdjustDimensions,
  onStartOver,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [pdfErrorMessage, setPdfErrorMessage] = useState<string | null>(null);

  // Pre-print warning modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<'download' | 'print'>('download');

  // Inspect modal state
  const [isInspectOpen, setIsInspectOpen] = useState<boolean>(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  const inspectTriggerRef = useRef<HTMLButtonElement>(null);
  const inspectCloseBtnRef = useRef<HTMLButtonElement>(null);
  const inspectDialogRef = useRef<HTMLDivElement>(null);

  const selectedPhoto =
    selectedPhotoIndex !== null && selectedPhotoIndex < layoutResult.photos.length
      ? layoutResult.photos[selectedPhotoIndex]
      : null;

  const handleOpenWarning = (action: 'download' | 'print') => {
    setPendingAction(action);
    setModalOpen(true);
  };

  const handleModalConfirm = async () => {
    setModalOpen(false);

    if (pendingAction === 'print') {
      window.print();
      return;
    }

    // Generate & Download PDF
    setIsGeneratingPdf(true);
    setPdfErrorMessage(null);
    setDownloadSuccess(false);

    try {
      const buffer = await photoBlob.arrayBuffer();
      const pdfBlob = await generatePrintReadyPdf(layoutResult, buffer, {
        filename: 'document-photos-a4.pdf',
        includeCutGuides: layoutResult.includeCutGuides,
        includeCalibrationRuler: true,
      });

      triggerFileDownload(pdfBlob, 'document-photos-a4.pdf');
      setDownloadSuccess(true);
    } catch (err: unknown) {
      console.error('Failed to generate PDF:', err);
      setPdfErrorMessage(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while generating the PDF document.'
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Inspect Modal accessibility & keyboard handlers
  useEffect(() => {
    if (!isInspectOpen) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;

    const focusTimer = setTimeout(() => {
      inspectCloseBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsInspectOpen(false);
      } else if (e.key === 'Tab' && inspectDialogRef.current) {
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
    <>
      <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-6 shadow-xs no-print">
        {/* Step Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] sm:text-xs font-bold text-white">
                7
              </span>
              <h2 className="text-base font-bold text-slate-900 sm:text-xl">
                Print &amp; PDF Export
              </h2>
            </div>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-600">
              Download your print-ready 300 DPI A4 PDF or print directly from your browser.
            </p>
          </div>

          {/* Quick Back Actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={onBackToLayout}
              className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 touch-press focus-visible:ring-2 focus-visible:ring-blue-600 shadow-2xs"
            >
              Adjust Layout
            </button>
            <button
              type="button"
              onClick={onAdjustDimensions}
              className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 touch-press focus-visible:ring-2 focus-visible:ring-blue-600 shadow-2xs"
            >
              Adjust Dimensions
            </button>
          </div>
        </div>

        {/* Main Responsive Layout:
            On mobile (< lg): Hero A4 Sheet Preview sits first near the top.
            On desktop (>= lg): 2 columns (Actions & Summary on left, Sticky Preview on right).
        */}
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Mobile Preview Hero (Shown on < lg screens near the top) */}
          <div className="flex flex-col items-center lg:hidden">
            <div className="w-full rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 sm:p-5 flex flex-col items-center shadow-xs">
              {/* Preview Toolbar */}
              <div className="w-full flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    A4 Sheet Preview
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500 bg-white border border-slate-200 rounded px-1.5 py-0.5 shadow-2xs">
                    {layoutResult.placedCount} {layoutResult.placedCount === 1 ? 'copy' : 'copies'}
                  </span>
                </div>

                <button
                  ref={inspectTriggerRef}
                  type="button"
                  onClick={() => setIsInspectOpen(true)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 touch-press focus-visible:ring-2 focus-visible:ring-blue-600 shadow-2xs"
                  aria-label="Enlarge and inspect final A4 sheet layout"
                >
                  <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  showCutGuides={layoutResult.includeCutGuides}
                  selectedPhotoIndex={selectedPhotoIndex}
                  onSelectPhoto={setSelectedPhotoIndex}
                />
              </div>

              {/* Photo Selection Feedback Bar */}
              <div className="w-full mt-3 pt-3 border-t border-slate-200/60">
                {selectedPhoto ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs text-blue-900 shadow-2xs animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                      <span className="truncate">
                        <strong>Photo #{selectedPhoto.index + 1}</strong>: {selectedPhoto.widthMm.toFixed(1)} × {selectedPhoto.heightMm.toFixed(1)} mm
                      </span>
                      <span className="text-blue-700 font-mono tabular-nums text-[11px] shrink-0">
                        (X: {selectedPhoto.xMm.toFixed(1)}, Y: {selectedPhoto.yMm.toFixed(1)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPhotoIndex(null)}
                      className="shrink-0 text-blue-700 hover:text-blue-950 text-xs font-semibold px-1 py-0.5 rounded focus-visible:ring-2 focus-visible:ring-blue-600"
                      aria-label="Clear photo selection"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <p className="text-center text-[11px] text-slate-500">
                    Tap any photo to view its exact print coordinates.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Left Column: Summary, Actions & Advice (7 cols on lg) */}
          <div className="flex flex-col gap-4 lg:col-span-7">
            {/* Sheet Configuration Summary Card */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                Final Print Summary
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Photo Size</span>
                  <span className="font-bold text-slate-900 font-mono tabular-nums">
                    {photoDimensions.widthMm.toFixed(1)} × {photoDimensions.heightMm.toFixed(1)} mm
                  </span>
                </div>

                <div className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Copies</span>
                  <span className="font-bold text-slate-900 font-mono tabular-nums">
                    {layoutResult.placedCount} photos
                  </span>
                </div>

                <div className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Paper Size</span>
                  <span className="font-bold text-slate-900 font-mono tabular-nums">
                    A4 (210 × 297 mm)
                  </span>
                </div>

                <div className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Arrangement</span>
                  <span className="font-bold text-slate-900 capitalize">
                    {layoutResult.layoutMode === 'single-row' ? '1 Single Row' : `${layoutResult.rows}R × ${layoutResult.columns}C Grid`}
                  </span>
                </div>

                <div className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Cut Guides</span>
                  <span className={`font-bold ${layoutResult.includeCutGuides ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {layoutResult.includeCutGuides ? 'Included (3 mm ticks)' : 'Off'}
                  </span>
                </div>

                <div className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Target Scale</span>
                  <span className="font-bold text-blue-700">
                    Exact 100% (300 DPI)
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                disabled={isGeneratingPdf}
                onClick={() => handleOpenWarning('download')}
                className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none touch-press focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors"
              >
                {isGeneratingPdf ? (
                  <>
                    <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Generating 300 DPI PDF...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download Print-Ready PDF (300 DPI)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleOpenWarning('print')}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 touch-press focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors"
              >
                <svg className="h-4.5 w-4.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print Directly in Browser</span>
              </button>
            </div>

            {/* Error Message Alert */}
            {pdfErrorMessage && (
              <div className="rounded-xl border border-rose-300 bg-rose-50/90 p-3.5 text-xs text-rose-950 shadow-2xs">
                <p className="font-bold">PDF Generation Error</p>
                <p className="mt-0.5 text-rose-800">{pdfErrorMessage}</p>
              </div>
            )}

            {/* Success Download Banner */}
            {downloadSuccess && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-3.5 text-xs text-emerald-950 flex items-center gap-2.5 shadow-2xs animate-in fade-in duration-150">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                  ✓
                </span>
                <div>
                  <p className="font-bold text-emerald-900">PDF Downloaded Successfully</p>
                  <p className="text-emerald-800">
                    File saved as <strong>document-photos-a4.pdf</strong>. Remember to print at 100% scale!
                  </p>
                </div>
              </div>
            )}

            {/* 100% Scale Educational Callout */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-950 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <svg className="h-4.5 w-4.5 text-amber-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-bold text-amber-900">Important Print Setting</p>
                  <p className="mt-1 text-amber-800 leading-relaxed">
                    Always set printer scaling to <strong>100% (Actual Size)</strong>. Consumer printers often default to &ldquo;Fit to Printable Area&rdquo;, which shrinks photos by 5–8%.
                  </p>
                  <p className="mt-1.5 text-amber-900 font-medium">
                    Use the 50 mm calibration ruler at the bottom of the printed page to verify physical accuracy with a real ruler.
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation and Reset Action */}
            <div className="mt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 pt-4 safe-area-bottom">
              <button
                type="button"
                onClick={onBackToLayout}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 touch-press focus-visible:ring-2 focus-visible:ring-blue-600 shadow-2xs"
              >
                Back to Sheet Layout
              </button>

              <button
                type="button"
                onClick={onStartOver}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 touch-press focus-visible:ring-2 focus-visible:ring-blue-600 shadow-2xs"
              >
                Change Photo
              </button>
            </div>
          </div>

          {/* Right Column: Desktop A4 Preview (5 cols on lg, sticky) */}
          <div className="hidden lg:flex flex-col items-center justify-start lg:col-span-5 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 shadow-xs self-start sticky top-4">
            <div className="w-full flex items-center justify-between mb-3 px-1">
              <div className="text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Final A4 Sheet Preview
                </h3>
                <p className="text-[11px] text-slate-500">
                  Physical 1:1 scale placement
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsInspectOpen(true)}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 touch-press focus-visible:ring-2 focus-visible:ring-blue-600 shadow-2xs"
                aria-label="Enlarge and inspect final A4 sheet layout"
              >
                <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
                <span>Inspect</span>
              </button>
            </div>

            <div className="w-full max-w-[360px]">
              <A4SheetPreview
                layoutResult={layoutResult}
                photoUrl={previewPhotoUrl}
                showCutGuides={layoutResult.includeCutGuides}
                selectedPhotoIndex={selectedPhotoIndex}
                onSelectPhoto={setSelectedPhotoIndex}
              />
            </div>

            {/* Photo Selection Feedback Bar (Desktop) */}
            <div className="w-full mt-3 pt-3 border-t border-slate-200/60">
              {selectedPhoto ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs text-blue-900 shadow-2xs animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                    <span className="truncate">
                      <strong>Photo #{selectedPhoto.index + 1}</strong>: {selectedPhoto.widthMm.toFixed(1)} × {selectedPhoto.heightMm.toFixed(1)} mm
                    </span>
                    <span className="text-blue-700 font-mono tabular-nums text-[11px] shrink-0">
                      (X: {selectedPhoto.xMm.toFixed(1)}, Y: {selectedPhoto.yMm.toFixed(1)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPhotoIndex(null)}
                    className="shrink-0 text-blue-700 hover:text-blue-950 text-xs font-semibold px-1 py-0.5 rounded focus-visible:ring-2 focus-visible:ring-blue-600"
                    aria-label="Clear photo selection"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <p className="text-center text-[11px] text-slate-500">
                  Click any photo on the sheet to inspect its physical print position.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pre-Print Scale Instruction Modal */}
      <PrePrintWarningModal
        isOpen={modalOpen}
        actionType={pendingAction}
        onConfirm={handleModalConfirm}
        onCancel={() => setModalOpen(false)}
      />

      {/* Enlarged Sheet Inspection Modal */}
      {isInspectOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 no-print"
          onClick={() => setIsInspectOpen(false)}
          role="presentation"
        >
          <div
            ref={inspectDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="inspect-final-sheet-heading"
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col max-h-[92dvh] w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5">
              <div>
                <h3 id="inspect-final-sheet-heading" className="text-sm font-bold text-slate-900 sm:text-base">
                  A4 Sheet Inspection (1:1 Scale)
                </h3>
                <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                  210 × 297 mm · {layoutResult.placedCount} {layoutResult.placedCount === 1 ? 'copy' : 'copies'} · {layoutResult.rows}R × {layoutResult.columns}C
                </p>
              </div>

              <button
                ref={inspectCloseBtnRef}
                type="button"
                onClick={() => setIsInspectOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 touch-press focus-visible:ring-2 focus-visible:ring-blue-600"
                aria-label="Close enlarged preview"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center bg-slate-50/50">
              <div className="w-full max-w-[420px] sm:max-w-[460px]">
                <A4SheetPreview
                  layoutResult={layoutResult}
                  photoUrl={previewPhotoUrl}
                  showCutGuides={layoutResult.includeCutGuides}
                  selectedPhotoIndex={selectedPhotoIndex}
                  onSelectPhoto={setSelectedPhotoIndex}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 bg-white px-4 py-3 sm:px-5 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-600 truncate">
                {selectedPhoto ? (
                  <span className="font-mono tabular-nums">
                    <strong>Photo #{selectedPhoto.index + 1}</strong>: {selectedPhoto.widthMm.toFixed(1)} × {selectedPhoto.heightMm.toFixed(1)} mm (X: {selectedPhoto.xMm.toFixed(1)}, Y: {selectedPhoto.yMm.toFixed(1)})
                  </span>
                ) : (
                  <span>Click any photo to inspect exact coordinates</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsInspectOpen(false)}
                className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 touch-press focus-visible:ring-2 focus-visible:ring-blue-600 shadow-2xs shrink-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Printable A4 Sheet Rendered Exclusively in Browser Print Mode */}
      <div className="printable-a4-sheet" aria-hidden="true">
        <svg
          viewBox={`0 0 ${layoutResult.sheetDimensions.widthMm} ${layoutResult.sheetDimensions.heightMm}`}
          className="h-full w-full"
        >
          <rect
            x="0"
            y="0"
            width={layoutResult.sheetDimensions.widthMm}
            height={layoutResult.sheetDimensions.heightMm}
            fill="#ffffff"
          />

          {/* Placed Photos */}
          {layoutResult.photos.map((photo) => (
            <g key={`print-photo-${photo.index}`}>
              <image
                href={previewPhotoUrl}
                x={photo.xMm}
                y={photo.yMm}
                width={photo.widthMm}
                height={photo.heightMm}
                preserveAspectRatio="none"
              />

              {/* Vector Cut Guides */}
              {layoutResult.includeCutGuides && photo.cutGuides && (
                <g stroke="#334155" strokeWidth="0.3" strokeLinecap="square">
                  <line
                    x1={photo.cutGuides.topLeft.horizontal.x1Mm}
                    y1={photo.cutGuides.topLeft.horizontal.y1Mm}
                    x2={photo.cutGuides.topLeft.horizontal.x2Mm}
                    y2={photo.cutGuides.topLeft.horizontal.y2Mm}
                  />
                  <line
                    x1={photo.cutGuides.topLeft.vertical.x1Mm}
                    y1={photo.cutGuides.topLeft.vertical.y1Mm}
                    x2={photo.cutGuides.topLeft.vertical.x2Mm}
                    y2={photo.cutGuides.topLeft.vertical.y2Mm}
                  />
                  <line
                    x1={photo.cutGuides.topRight.horizontal.x1Mm}
                    y1={photo.cutGuides.topRight.horizontal.y1Mm}
                    x2={photo.cutGuides.topRight.horizontal.x2Mm}
                    y2={photo.cutGuides.topRight.horizontal.y2Mm}
                  />
                  <line
                    x1={photo.cutGuides.topRight.vertical.x1Mm}
                    y1={photo.cutGuides.topRight.vertical.y1Mm}
                    x2={photo.cutGuides.topRight.vertical.x2Mm}
                    y2={photo.cutGuides.topRight.vertical.y2Mm}
                  />
                  <line
                    x1={photo.cutGuides.bottomLeft.horizontal.x1Mm}
                    y1={photo.cutGuides.bottomLeft.horizontal.y1Mm}
                    x2={photo.cutGuides.bottomLeft.horizontal.x2Mm}
                    y2={photo.cutGuides.bottomLeft.horizontal.y2Mm}
                  />
                  <line
                    x1={photo.cutGuides.bottomLeft.vertical.x1Mm}
                    y1={photo.cutGuides.bottomLeft.vertical.y1Mm}
                    x2={photo.cutGuides.bottomLeft.vertical.x2Mm}
                    y2={photo.cutGuides.bottomLeft.vertical.y2Mm}
                  />
                  <line
                    x1={photo.cutGuides.bottomRight.horizontal.x1Mm}
                    y1={photo.cutGuides.bottomRight.horizontal.y1Mm}
                    x2={photo.cutGuides.bottomRight.horizontal.x2Mm}
                    y2={photo.cutGuides.bottomRight.horizontal.y2Mm}
                  />
                  <line
                    x1={photo.cutGuides.bottomRight.vertical.x1Mm}
                    y1={photo.cutGuides.bottomRight.vertical.y1Mm}
                    x2={photo.cutGuides.bottomRight.vertical.x2Mm}
                    y2={photo.cutGuides.bottomRight.vertical.y2Mm}
                  />
                </g>
              )}
            </g>
          ))}

          {/* 50 mm Calibration Ruler in Bottom Margin */}
          <g transform={`translate(${(layoutResult.sheetDimensions.widthMm - 50) / 2}, ${layoutResult.sheetDimensions.heightMm - 10})`}>
            <line x1="0" y1="4" x2="50" y2="4" stroke="#475569" strokeWidth="0.3" />
            {[0, 10, 20, 30, 40, 50].map((t) => (
              <line key={`print-tick-${t}`} x1={t} y1="0.5" x2={t} y2="4" stroke="#475569" strokeWidth="0.3" />
            ))}
            {[5, 15, 25, 35, 45].map((t) => (
              <line key={`print-subtick-${t}`} x1={t} y1="2" x2={t} y2="4" stroke="#64748b" strokeWidth="0.2" />
            ))}
            <text
              x="25"
              y="-1"
              fontSize="2.2"
              fill="#475569"
              textAnchor="middle"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              50 mm Calibration Ruler (Verify 100% Scale After Printing)
            </text>
          </g>
        </svg>
      </div>
    </>
  );
};
