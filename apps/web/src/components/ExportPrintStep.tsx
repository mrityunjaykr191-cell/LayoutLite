import React, { useState } from 'react';
import {
  type PhotoDimensions,
  type SheetLayoutResult,
  A4_SHEET_DIMENSIONS_MM,
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

  return (
    <>
      <div className="w-full rounded-xl border border-slate-200 bg-white p-3.5 sm:p-6 shadow-xs no-print">
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
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Adjust Layout
            </button>
            <button
              type="button"
              onClick={onAdjustDimensions}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Adjust Dimensions
            </button>
          </div>
        </div>

        {/* Main Two-Column Layout */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Actions & Print Advice (7 cols) */}
          <div className="flex flex-col gap-5 lg:col-span-7">
            {/* Sheet Configuration Summary Card */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                Final Print Summary
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-md bg-white p-2.5 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Photo Size</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {photoDimensions.widthMm.toFixed(1)} × {photoDimensions.heightMm.toFixed(1)} mm
                  </span>
                </div>

                <div className="rounded-md bg-white p-2.5 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Copies</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {layoutResult.placedCount} photos
                  </span>
                </div>

                <div className="rounded-md bg-white p-2.5 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Paper Size</span>
                  <span className="font-bold text-slate-900 font-mono">
                    A4 ({A4_SHEET_DIMENSIONS_MM.widthMm} × {A4_SHEET_DIMENSIONS_MM.heightMm} mm)
                  </span>
                </div>

                <div className="rounded-md bg-white p-2.5 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Arrangement</span>
                  <span className="font-bold text-slate-900 capitalize">
                    {layoutResult.layoutMode === 'single-row' ? '1 Single Row' : `${layoutResult.rows}R × ${layoutResult.columns}C Grid`}
                  </span>
                </div>

                <div className="rounded-md bg-white p-2.5 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Cut Guides</span>
                  <span className={`font-bold ${layoutResult.includeCutGuides ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {layoutResult.includeCutGuides ? 'Included (3 mm ticks)' : 'Off'}
                  </span>
                </div>

                <div className="rounded-md bg-white p-2.5 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Target Scale</span>
                  <span className="font-bold text-blue-700">
                    Exact 100% Physical
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={isGeneratingPdf}
                onClick={() => handleOpenWarning('download')}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors"
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
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-800 shadow-xs hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors"
              >
                <svg className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print Directly in Browser</span>
              </button>
            </div>

            {/* Error Message Alert */}
            {pdfErrorMessage && (
              <div className="rounded-lg border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-950">
                <p className="font-bold">PDF Generation Error</p>
                <p className="mt-0.5 text-rose-800">{pdfErrorMessage}</p>
              </div>
            )}

            {/* Success Download Banner */}
            {downloadSuccess && (
              <div className="rounded-lg border border-emerald-300 bg-emerald-50/80 p-3.5 text-xs text-emerald-950 flex items-center gap-2.5">
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
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-950">
              <div className="flex items-start gap-2.5">
                <svg className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={onBackToLayout}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                Back to Sheet Layout
              </button>

              <button
                type="button"
                onClick={onStartOver}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                Change Photo
              </button>
            </div>
          </div>

          {/* Right Column: Preview (5 cols) */}
          <div className="flex flex-col items-center justify-start lg:col-span-5 bg-slate-50/70 p-4 sm:p-6 rounded-xl border border-slate-200">
            <div className="mb-3 text-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Final A4 Sheet Preview
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Physical 1:1 Scale Print Preview
              </p>
            </div>

            <A4SheetPreview
              layoutResult={layoutResult}
              photoUrl={previewPhotoUrl}
              showCutGuides={layoutResult.includeCutGuides}
            />
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
