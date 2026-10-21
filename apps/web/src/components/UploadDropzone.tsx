import React, { useState, useRef } from 'react';
import { MAX_FILE_SIZE_BYTES, formatFileSize } from '../utils/fileValidation';

interface UploadDropzoneProps {
  readonly onFileSelected: (file: File) => void;
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  readonly onClearError: () => void;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFileSelected,
  isLoading,
  errorMessage,
  onClearError,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        onFileSelected(droppedFile);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile) {
        onFileSelected(selectedFile);
      }
      e.target.value = '';
    }
  };

  const handleTriggerBrowse = () => {
    if (!isLoading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="w-full">
      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        id="layoutlite-photo-upload-input"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileInputChange}
        disabled={isLoading}
        aria-describedby="upload-guidelines"
      />

      {/* Recoverable Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-4 flex items-start justify-between rounded-xl border border-red-200 bg-red-50 p-3.5 sm:p-4 text-xs sm:text-sm text-red-900 shadow-xs"
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
              <p className="font-semibold text-red-950">File could not be loaded</p>
              <p className="mt-0.5 text-red-800">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearError}
            className="ml-2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-red-700 hover:bg-red-100 hover:text-red-900 focus-visible:ring-2 focus-visible:ring-red-600 touch-press"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleTriggerBrowse}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTriggerBrowse();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label="Upload photo. Click or drag and drop a JPG, PNG, or WebP portrait image."
        className={`group relative flex min-h-[200px] sm:min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-150 ${
          isDragOver
            ? 'border-blue-600 bg-blue-50/70 ring-4 ring-blue-100'
            : 'border-slate-300 bg-white hover:border-blue-500 hover:bg-slate-50/60 shadow-xs'
        } ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-6" role="status" aria-live="polite">
            <div className="h-9 w-9 sm:h-10 sm:w-10 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
            <p className="text-xs sm:text-sm font-medium text-slate-700">Reading and preparing photo...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center max-w-md">
            {/* Upload Icon inside concentric pill */}
            <div
              className={`mb-3.5 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl transition-all duration-150 ${
                isDragOver ? 'scale-110 bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'
              }`}
            >
              <svg
                className="h-6 w-6 sm:h-7 sm:w-7"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
            </div>

            {/* Prompt text */}
            <p className="text-sm font-semibold text-slate-900 sm:text-base">
              {isDragOver ? 'Drop portrait photo here' : 'Choose a portrait photo'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Drag and drop an image file here, or click to browse
            </p>

            {/* Visual Action Button */}
            <span
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs group-hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 touch-press"
              aria-hidden="true"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Select Photo File
            </span>

            {/* Requirements Pills */}
            <div
              id="upload-guidelines"
              className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-mono text-slate-500"
            >
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium text-slate-600">
                JPG, PNG, WebP
              </span>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium text-slate-600 tabular-nums">
                Max {formatFileSize(MAX_FILE_SIZE_BYTES)}
              </span>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium text-slate-600">
                Local Only
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
