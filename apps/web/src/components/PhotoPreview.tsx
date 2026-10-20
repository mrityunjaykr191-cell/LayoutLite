import React from 'react';
import { formatFileSize } from '../utils/fileValidation';

export interface PhotoMetadata {
  readonly name: string;
  readonly size: number;
  readonly width: number;
  readonly height: number;
  readonly objectUrl: string;
  readonly isLowResolution: boolean;
  readonly lowResolutionMessage?: string;
  readonly orientationLabel: 'Portrait' | 'Landscape' | 'Square';
}

interface PhotoPreviewProps {
  readonly photo: PhotoMetadata;
  readonly onReplace: () => void;
  readonly onRemove: () => void;
  readonly errorMessage?: string | null;
  readonly onClearError?: () => void;
}

export const PhotoPreview: React.FC<PhotoPreviewProps> = ({
  photo,
  onReplace,
  onRemove,
  errorMessage,
  onClearError,
}) => {
  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-3.5 sm:p-6 shadow-xs">
      {/* Error Banner for Replace Photo Failures */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-3.5 flex items-start justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-xs sm:text-sm text-red-900"
        >
          <div className="flex items-start gap-2.5">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-red-600 sm:h-5 sm:w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="font-semibold text-red-950">Replacement file rejected</p>
              <p className="mt-0.5 text-red-800">{errorMessage}</p>
            </div>
          </div>
          {onClearError && (
            <button
              type="button"
              onClick={onClearError}
              className="ml-2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-red-700 hover:bg-red-100 hover:text-red-900 focus-visible:ring-2 focus-visible:ring-red-600"
              aria-label="Dismiss replacement error"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Header bar: Status badge & Action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] sm:text-xs font-semibold text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Photo Loaded
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500 font-mono truncate max-w-[180px] sm:max-w-xs" title={photo.name}>
              {photo.name}
            </span>
          </div>
        </div>

        {/* Action buttons with minimum 44px touch targets */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
          <button
            type="button"
            onClick={onReplace}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 active:scale-[0.96] transition-transform"
          >
            <svg className="h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Replace Photo</span>
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-600 active:scale-[0.96] transition-transform"
          >
            <svg className="h-4 w-4 shrink-0 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Remove</span>
          </button>
        </div>
      </div>

      {/* Low-resolution alert if applicable */}
      {photo.isLowResolution && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 flex items-start gap-2">
          <span className="font-bold text-amber-700 shrink-0">Notice:</span>
          <span>{photo.lowResolutionMessage}</span>
        </div>
      )}

      {/* Streamlined Image Preview Stage */}
      <div className="mt-3.5 flex flex-col items-center justify-center rounded-lg bg-slate-50 p-2 sm:p-4 border border-slate-100">
        <div className="relative max-h-[260px] sm:max-h-[360px] max-w-full overflow-hidden rounded-md shadow-xs bg-white">
          <img
            src={photo.objectUrl}
            alt="Preview of uploaded portrait photo"
            className="max-h-[250px] sm:max-h-[350px] max-w-full object-contain rounded-md"
            style={{
              outline: '1px solid rgba(0, 0, 0, 0.1)',
              outlineOffset: '-1px',
            }}
          />
        </div>

        {/* Metadata Details Pill Bar */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-600 font-mono">
          <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 sm:px-2.5 sm:py-1">
            <span className="font-sans text-slate-400 mr-1">Dimensions:</span>
            <span className="font-semibold text-slate-800">{photo.width} × {photo.height} px</span>
          </span>
          <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 sm:px-2.5 sm:py-1">
            <span className="font-sans text-slate-400 mr-1">Size:</span>
            <span className="font-semibold text-slate-800">{formatFileSize(photo.size)}</span>
          </span>
          <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 sm:px-2.5 sm:py-1">
            <span className="font-sans text-slate-400 mr-1">Type:</span>
            <span className="font-semibold text-slate-800">{photo.orientationLabel}</span>
          </span>
        </div>
      </div>

      {/* Next Step Information Callout */}
      <div className="mt-3.5 rounded-lg border border-blue-100 bg-blue-50/60 p-3 sm:p-4 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div>
          <p className="font-semibold text-blue-950">Next: Step 2 — Crop &amp; Position</p>
          <p className="mt-0.5 text-blue-800 text-[11px] sm:text-xs">
            Face framing, rotation, and physical photo dimension controls will be enabled in Phase 3.
          </p>
        </div>
        <div className="shrink-0 self-start sm:self-auto">
          <span className="inline-flex rounded-md bg-blue-600/20 px-2.5 py-1 text-[11px] font-semibold text-blue-800">
            Phase 2A Ready
          </span>
        </div>
      </div>
    </div>
  );
};
