import React from 'react';
import { CroppedPhotoResult } from '../utils/cropExporter';

interface CroppedResultCardProps {
  readonly result: CroppedPhotoResult;
  readonly originalFileName: string;
  readonly onEditCrop: () => void;
  readonly onReplacePhoto: () => void;
}

export const CroppedResultCard: React.FC<CroppedResultCardProps> = ({
  result,
  originalFileName,
  onEditCrop,
  onReplacePhoto,
}) => {
  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-3.5 sm:p-6 shadow-xs">
      {/* Header bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] sm:text-xs font-semibold text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Photo Cropped
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500 font-mono truncate max-w-[180px] sm:max-w-xs" title={originalFileName}>
              {originalFileName}
            </span>
          </div>
          <h2 className="mt-1 text-sm sm:text-base font-bold text-slate-900">
            Cropped &amp; Framed Portrait
          </h2>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
          <button
            type="button"
            onClick={onEditCrop}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 active:scale-[0.96] transition-transform"
          >
            <svg className="h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Adjust Crop</span>
          </button>

          <button
            type="button"
            onClick={onReplacePhoto}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 active:scale-[0.96] transition-transform"
          >
            <span>Change Photo</span>
          </button>
        </div>
      </div>

      {/* Cropped Image Stage */}
      <div className="mt-3.5 flex flex-col items-center justify-center rounded-lg bg-slate-50 p-3 sm:p-5 border border-slate-100">
        <div className="relative max-h-[280px] sm:max-h-[380px] max-w-full overflow-hidden rounded-md shadow-xs bg-white">
          <img
            src={result.objectUrl}
            alt="Final cropped portrait preview"
            className="max-h-[270px] sm:max-h-[370px] max-w-full object-contain rounded-md"
            style={{
              outline: '1px solid rgba(0, 0, 0, 0.1)',
              outlineOffset: '-1px',
            }}
          />
        </div>

        {/* Metadata Details Pill Bar */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-600 font-mono">
          <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 sm:px-2.5 sm:py-1">
            <span className="font-sans text-slate-400 mr-1">Print Size:</span>
            <span className="font-semibold text-slate-800">{result.photoDimensions.widthMm} × {result.photoDimensions.heightMm} mm</span>
          </span>
          <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 sm:px-2.5 sm:py-1">
            <span className="font-sans text-slate-400 mr-1">Resolution:</span>
            <span className="font-semibold text-slate-800">{result.widthPx} × {result.heightPx} px</span>
          </span>
          <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 sm:px-2.5 sm:py-1">
            <span className="font-sans text-slate-400 mr-1">Zoom:</span>
            <span className="font-semibold text-slate-800">{result.cropSettings.zoom.toFixed(1)}×</span>
          </span>
          {result.cropSettings.rotation !== 0 && (
            <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 sm:px-2.5 sm:py-1">
              <span className="font-sans text-slate-400 mr-1">Rotation:</span>
              <span className="font-semibold text-slate-800">{result.cropSettings.rotation}°</span>
            </span>
          )}
        </div>
      </div>

      {/* Next Step Information Callout */}
      <div className="mt-3.5 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 sm:p-4 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div>
          <p className="font-semibold text-emerald-950">Crop Saved</p>
          <p className="mt-0.5 text-emerald-800 text-[11px] sm:text-xs">
            Ready for background adjustment or dimension settings.
          </p>
        </div>
      </div>
    </div>
  );
};
