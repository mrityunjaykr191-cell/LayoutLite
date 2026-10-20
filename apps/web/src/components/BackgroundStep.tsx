import React, { useState, useEffect, useRef } from 'react';
import {
  checkServiceHealth,
  removeBackground,
  BackgroundRemovalError,
  ServiceHealthResult,
} from '../services/backgroundRemovalClient';

interface BackgroundStepProps {
  readonly croppedPhotoUrl: string;
  readonly croppedBlob: Blob;
  readonly cutoutUrl: string | null;
  readonly isBackgroundSkipped: boolean;
  readonly onCutoutGenerated: (blob: Blob, objectUrl: string) => void;
  readonly onSkipBackground: () => void;
  readonly onRevertToOriginal: () => void;
  readonly onBackToCrop: () => void;
  readonly onProceedToColor: () => void;
  readonly onReplacePhoto: () => void;
}

export const BackgroundStep: React.FC<BackgroundStepProps> = ({
  croppedPhotoUrl,
  croppedBlob,
  cutoutUrl,
  isBackgroundSkipped,
  onCutoutGenerated,
  onSkipBackground,
  onRevertToOriginal,
  onBackToCrop,
  onProceedToColor,
  onReplacePhoto,
}) => {
  const [health, setHealth] = useState<ServiceHealthResult | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active abort controller for current removal request
  const abortControllerRef = useRef<AbortController | null>(null);

  const performHealthCheck = async () => {
    setIsCheckingHealth(true);
    try {
      const result = await checkServiceHealth();
      setHealth(result);
    } catch {
      setHealth({ ok: false, ready: false, error: 'Cannot connect to local service' });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    performHealthCheck();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleStartRemoval = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const pngBlob = await removeBackground(croppedBlob, {
        externalSignal: controller.signal,
        timeoutMs: 35000,
      });

      const newCutoutUrl = URL.createObjectURL(pngBlob);
      onCutoutGenerated(pngBlob, newCutoutUrl);
    } catch (err: unknown) {
      if (err instanceof BackgroundRemovalError && err.isCancelled) {
        // Request was cancelled intentionally, do not display an error
        return;
      }
      const message =
        err instanceof Error
          ? err.message
          : 'Background removal failed. You can retry or proceed with your original photo.';
      setErrorMessage(message);
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelRemoval = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
  };

  const isCutoutActive = Boolean(cutoutUrl);

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-3.5 sm:p-6 shadow-xs">
      {/* Step Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] sm:text-xs font-bold text-white">
              3
            </span>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Optional Background Removal
            </h2>
            {isCutoutActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Background Removed
              </span>
            )}
            {isBackgroundSkipped && !isCutoutActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
                Original Background Kept
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Cleanly isolate the portrait subject with AI, or skip to keep the original photo background.
          </p>
        </div>

        {/* Local Service Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isCheckingHealth ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
              Checking service...
            </span>
          ) : health?.ok ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200"
              title="Local Python FastAPI microservice is running at http://127.0.0.1:8000"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              AI Service Ready (Local)
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 border border-amber-200"
              title="Service unreachable at http://127.0.0.1:8000"
            >
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              AI Service Offline
            </span>
          )}
        </div>
      </div>

      {/* Main Stage: Photo Display & Controls */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        {/* Left / Center Preview Pane (md:col-span-6) */}
        <div className="md:col-span-6 flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-4 min-h-[300px]">
          <div className="relative max-h-[320px] max-w-full overflow-hidden rounded-md shadow-xs bg-white">
            {/* Checkerboard backdrop for transparent PNG preview */}
            {isCutoutActive && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `linear-gradient(45deg, #e2e8f0 25%, transparent 25%), 
                                    linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), 
                                    linear-gradient(45deg, transparent 75%, #e2e8f0 75%), 
                                    linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)`,
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                  opacity: 0.7,
                }}
                aria-hidden="true"
              />
            )}

            <img
              src={cutoutUrl ?? croppedPhotoUrl}
              alt={isCutoutActive ? 'Portrait with background removed' : 'Cropped portrait'}
              className="relative max-h-[300px] max-w-full object-contain rounded-md"
              style={{
                outline: '1px solid rgba(0, 0, 0, 0.1)',
                outlineOffset: '-1px',
              }}
            />
          </div>

          <p className="mt-2.5 text-xs font-medium text-slate-500">
            {isCutoutActive
              ? 'Transparent Cutout Preview (checkerboard shows transparency)'
              : 'Cropped Portrait (Original Background)'}
          </p>
        </div>

        {/* Right Action / Status Pane (md:col-span-6) */}
        <div className="md:col-span-6 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-3">
            {/* Offline Alert Notice */}
            {!isCheckingHealth && !health?.ok && !isCutoutActive && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                <div className="flex items-start gap-2">
                  <svg
                    className="h-4 w-4 shrink-0 text-amber-600 mt-0.5"
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
                  <div className="flex-1">
                    <p className="font-semibold text-amber-950">Local AI Service Not Detected</p>
                    <p className="mt-1 text-amber-800 leading-relaxed">
                      The background removal service is not running at{' '}
                      <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px]">
                        http://127.0.0.1:8000
                      </code>
                      . You can start it via terminal or simply skip to keep your original photo background.
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={performHealthCheck}
                        disabled={isCheckingHealth}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100/50 focus-visible:ring-2 focus-visible:ring-blue-600"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        <span>Check Again</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message Alert */}
            {errorMessage && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-900"
              >
                <div className="flex items-start gap-2">
                  <svg
                    className="h-4 w-4 shrink-0 text-red-600 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="font-semibold text-red-950">Background Removal Failed</p>
                    <p className="mt-0.5 text-red-800">{errorMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* In-Flight Processing Spinner */}
            {isProcessing && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className="h-5 w-5 animate-spin text-blue-600 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  <div>
                    <p className="font-bold text-blue-950">Removing Background with AI...</p>
                    <p className="mt-0.5 text-blue-800 text-[11px]">
                      Isolating portrait subject on your device. This typically takes 1–3 seconds.
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleCancelRemoval}
                    className="inline-flex min-h-[36px] items-center rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Cutout Ready Success Message */}
            {isCutoutActive && !isProcessing && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950">
                <div className="flex items-start gap-2">
                  <svg
                    className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="font-bold text-emerald-950">Subject Isolated Successfully</p>
                    <p className="mt-0.5 text-emerald-800 text-[11px] leading-relaxed">
                      Your portrait background has been cleanly removed. Click below to choose a solid background color (White, Off-white, Light Blue, or custom).
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            {isCutoutActive ? (
              // Actions when cutout is already generated
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onProceedToColor}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 active:scale-[0.98] transition-transform"
                >
                  <span>Continue to Color</span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onRevertToOriginal}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 active:scale-[0.98]"
                  >
                    Revert to Original
                  </button>

                  <button
                    type="button"
                    onClick={onBackToCrop}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 active:scale-[0.98]"
                  >
                    Adjust Crop
                  </button>
                </div>
              </div>
            ) : (
              // Actions when cutout has not been generated
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleStartRemoval}
                  disabled={isProcessing}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50 active:scale-[0.98] transition-transform"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                    />
                  </svg>
                  <span>Remove Background</span>
                </button>

                <button
                  type="button"
                  onClick={onSkipBackground}
                  disabled={isProcessing}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 active:scale-[0.98] transition-transform"
                >
                  <span>Keep Original Background</span>
                </button>

                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={onBackToCrop}
                    disabled={isProcessing}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    Adjust Crop
                  </button>

                  <button
                    type="button"
                    onClick={onReplacePhoto}
                    disabled={isProcessing}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    Change Photo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
