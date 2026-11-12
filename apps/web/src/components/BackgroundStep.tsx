import React, { useState, useEffect, useRef } from 'react';
import {
  BackgroundRemovalError,
  providerRegistry,
  type BackgroundRemovalHealth,
  type BackgroundRemovalMode,
} from '../services/backgroundRemovalClient.ts';

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
  readonly activeMode?: BackgroundRemovalMode;
  readonly onModeChange?: (mode: BackgroundRemovalMode) => void;
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
  activeMode,
  onModeChange,
}) => {
  // Mode state: local backend by default on first visit
  const [mode, setMode] = useState<BackgroundRemovalMode>(() =>
    activeMode ?? providerRegistry.getActiveMode()
  );
  const [hasConsent, setHasConsent] = useState<boolean>(() =>
    providerRegistry.hasExternalProcessingConsent()
  );
  const [isConsentModalOpen, setIsConsentModalOpen] = useState<boolean>(false);

  // Health and processing states
  const [health, setHealth] = useState<BackgroundRemovalHealth | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active abort controller for current removal request
  const abortControllerRef = useRef<AbortController | null>(null);

  // Synchronize internal mode with activeMode prop if supplied
  useEffect(() => {
    if (activeMode && activeMode !== mode) {
      setMode(activeMode);
    }
  }, [activeMode]);

  // Subscribe to providerRegistry changes (mode, consent)
  useEffect(() => {
    return providerRegistry.subscribe(({ mode: updatedMode, consent }) => {
      setMode(updatedMode);
      setHasConsent(consent);
    });
  }, []);

  const performHealthCheck = async (targetMode?: BackgroundRemovalMode) => {
    const currentMode = targetMode ?? mode;
    setIsCheckingHealth(true);
    try {
      const provider = providerRegistry.getProvider(currentMode);
      const result = await provider.checkHealth();
      setHealth(result);
    } catch (err: unknown) {
      setHealth({
        ok: false,
        ready: false,
        mode: currentMode,
        endpointUrl: '',
        error: err instanceof Error ? err.message : 'Service unreachable',
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    performHealthCheck(mode);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [mode]);

  const handleModeSelect = (newMode: BackgroundRemovalMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    providerRegistry.setActiveMode(newMode);
    onModeChange?.(newMode);
    setErrorMessage(null);
  };

  const handleStartRemovalClick = () => {
    if (mode === 'remote' && !providerRegistry.hasExternalProcessingConsent()) {
      setIsConsentModalOpen(true);
      return;
    }
    executeRemoval();
  };

  const handleConfirmConsent = () => {
    providerRegistry.setExternalProcessingConsent(true);
    setHasConsent(true);
    setIsConsentModalOpen(false);
    executeRemoval();
  };

  const handleRevokeConsent = () => {
    providerRegistry.setExternalProcessingConsent(false);
    setHasConsent(false);
  };

  const executeRemoval = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const provider = providerRegistry.getActiveProvider();
      const pngBlob = await provider.removeBackground(croppedBlob, {
        externalSignal: controller.signal,
        timeoutMs: 75000,
      });

      const newCutoutUrl = URL.createObjectURL(pngBlob);
      onCutoutGenerated(pngBlob, newCutoutUrl);
    } catch (err: unknown) {
      if (err instanceof BackgroundRemovalError && err.isCancelled) {
        // Request was cancelled intentionally
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
  const isRemote = mode === 'remote';

  return (
    <div className="w-full rounded-xl border border-[#E3E1DC] bg-white p-4 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Step Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E3E1DC] pb-3 sm:pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#393834]">
              Optional Background Removal
            </h2>
            {isCutoutActive && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
                Background Removed
              </span>
            )}
            {isBackgroundSkipped && !isCutoutActive && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#FAF9F6] px-2 py-0.5 text-xs font-medium text-[#777570] border border-[#E3E1DC]">
                Original Kept
              </span>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#777570]">
            Isolate the portrait subject with AI, or keep your original photo background.
          </p>
        </div>

        {/* Mode Selector & Service Status */}
        <div className="flex flex-col sm:items-end gap-2 self-start sm:self-auto">
          {/* Segmented Mode Selector */}
          <div
            role="radiogroup"
            aria-label="Background removal processing mode"
            className="inline-flex items-center rounded-lg border border-[#E3E1DC] bg-[#FAF9F6] p-0.5 shadow-2xs"
          >
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'remote'}
              onClick={() => handleModeSelect('remote')}
              className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none ${
                mode === 'remote'
                  ? 'bg-white text-[#393834] font-semibold shadow-2xs border border-[#E3E1DC]'
                  : 'text-[#777570] hover:text-[#393834]'
              }`}
            >
              <span>Cloud AI (remove.bg)</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'local'}
              onClick={() => handleModeSelect('local')}
              className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none ${
                mode === 'local'
                  ? 'bg-white text-[#393834] font-semibold shadow-2xs border border-[#E3E1DC]'
                  : 'text-[#777570] hover:text-[#393834]'
              }`}
            >
              <span>Local AI (u2netp)</span>
            </button>
          </div>

          {/* Service Status Indicator for Active Mode */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isCheckingHealth ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-[#777570]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#777570] animate-pulse" />
                Checking {isRemote ? 'cloud' : 'local'} service...
              </span>
            ) : health?.ok && health.ready ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-md border border-[#E3E1DC] bg-[#FAF9F6] px-2.5 py-1 text-xs font-medium text-[#55534F]"
                title={
                  isRemote
                    ? `Cloud service ready at ${health.endpointUrl || 'Vercel API'}`
                    : `Local service running at ${health.endpointUrl}`
                }
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
                <span>{isRemote ? 'Cloud Service Ready' : 'Local Service Ready'}</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50/80 px-2.5 py-1 text-xs font-medium text-amber-900"
                title={health?.error ?? 'Service offline'}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-600" aria-hidden="true" />
                <span>{isRemote ? 'Cloud Service Not Ready' : 'Local AI Offline'}</span>
              </span>
            )}
            {mode === 'remote' && hasConsent && (
              <button
                type="button"
                onClick={handleRevokeConsent}
                className="inline-flex min-h-[44px] items-center rounded px-2 text-xs text-[#55534F] underline hover:text-[#393834] focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none"
              >
                Revoke Consent
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Preview Pane (md:col-span-6) */}
        <div className="md:col-span-6 flex flex-col items-center justify-center rounded-lg border border-[#E3E1DC] bg-[#FAF9F6] p-4 min-h-[260px] sm:min-h-[320px]">
          <div className="relative max-h-[300px] max-w-full overflow-hidden rounded-lg shadow-sm bg-white border border-[#E3E1DC]">
            {/* Checkerboard backdrop for transparent PNG */}
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
              className="relative max-h-[280px] max-w-full object-contain rounded-lg"
            />
          </div>

          <p className="mt-3 text-xs text-[#777570] text-center">
            {isCutoutActive
              ? 'Transparent Cutout (checkerboard indicates transparency)'
              : 'Cropped Portrait (Original Background)'}
          </p>
        </div>

        {/* Right Controls & Actions Pane (md:col-span-6) */}
        <div className="md:col-span-6 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-3">
            {/* Local service offline notice */}
            {mode === 'local' && !isCheckingHealth && !(health?.ok && health.ready) && !isCutoutActive && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-950">
                <div className="flex items-start gap-2.5">
                  <svg className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-semibold text-amber-950">
                      Local Service Not Running
                    </p>
                    <p className="mt-0.5 text-amber-800 leading-relaxed text-[11px]">
                      The local background removal service is not detected at <code className="font-mono text-amber-900">http://127.0.0.1:8000</code>. Start it in your terminal with <code className="font-mono text-amber-900">python run.py</code>, click Check Again, or choose Keep Original Background.
                    </p>
                    <div className="mt-2.5">
                      <button
                        type="button"
                        onClick={() => performHealthCheck('local')}
                        disabled={isCheckingHealth}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100/60 focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none touch-press"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Check Again</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cloud service offline / unconfigured notice */}
            {mode === 'remote' && !isCheckingHealth && !(health?.ok && health.ready) && !isCutoutActive && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-950">
                <div className="flex items-start gap-2.5">
                  <svg className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-semibold text-amber-950">
                      Cloud AI Service Not Configured
                    </p>
                    <p className="mt-0.5 text-amber-800 leading-relaxed text-[11px]">
                      {health?.error || 'Set REMOVE_BG_API_KEY in your Vercel project Environment Variables, or switch to Local Service.'}
                    </p>
                    <div className="mt-2.5">
                      <button
                        type="button"
                        onClick={() => performHealthCheck('remote')}
                        disabled={isCheckingHealth}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100/60 focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none touch-press"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Check Again</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Remote service offline or unconfigured notice */}
            {mode === 'remote' && !isCheckingHealth && !(health?.ok && health.ready) && !isCutoutActive && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-950">
                <div className="flex items-start gap-2.5">
                  <svg className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-semibold text-amber-950">
                      {!providerRegistry.isRemoteConfigured()
                        ? 'Cloud Service Endpoint Not Configured'
                        : health?.ok
                        ? 'remove.bg API Key Not Configured'
                        : 'Cloud Service Unavailable'}
                    </p>
                    <p className="mt-0.5 text-amber-800 leading-relaxed text-[11px]">
                      {!providerRegistry.isRemoteConfigured()
                        ? 'The cloud background removal endpoint (VITE_REMOTE_BG_REMOVER_URL) is not set. You can use the local service or keep your original photo.'
                        : health?.ok
                        ? health.error ?? 'Set REMOVE_BG_API_KEY on the background-removal service.'
                        : 'Cannot connect to the cloud background removal service. Check your connection or switch to the local service.'}
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => performHealthCheck('remote')}
                        disabled={isCheckingHealth}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100/60 focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none touch-press"
                      >
                        <span>Check Again</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModeSelect('local')}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#E3E1DC] bg-white px-3 py-1 text-xs font-medium text-[#393834] hover:bg-[#FAF9F6] focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none touch-press"
                      >
                        <span>Switch to Local Service</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* In-Flight Processing Banner */}
            {isProcessing && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-lg border border-[#E3E1DC] bg-[#FAF9F6] p-4 text-xs text-[#393834]"
              >
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#55534F] border-t-transparent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#393834]">
                      Removing Background with remove.bg...
                    </p>
                    <p className="mt-0.5 text-[#777570] text-[11px]">
                      Sending photo to remove.bg for processing. This may take a little while.
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleCancelRemoval}
                    className="inline-flex min-h-[36px] items-center rounded-lg border border-[#E3E1DC] bg-white px-3 py-1 text-xs font-medium text-[#393834] hover:bg-[#FAF9F6] focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none touch-press"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Error Alert */}
            {errorMessage && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-950"
              >
                <div className="flex items-start gap-2">
                  <svg className="h-4 w-4 shrink-0 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-red-950">Background Removal Failed</p>
                    <p className="mt-0.5 text-red-800">{errorMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Cutout Success Confirmation */}
            {isCutoutActive && !isProcessing && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950">
                <div className="flex items-start gap-2">
                  <svg className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="font-semibold text-emerald-950">Subject Isolated Successfully</p>
                    <p className="mt-0.5 text-emerald-800 text-[11px] leading-relaxed">
                      Your portrait background is cleanly removed. Continue to choose a solid background color (White, Off-white, Light Blue, or custom).
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Navigation Footer */}
          <div className="flex flex-col gap-2.5 pt-3 border-t border-[#E3E1DC]">
            {isCutoutActive ? (
              // Actions when cutout exists
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={onProceedToColor}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#55534F] hover:bg-[#45433F] active:bg-[#383633] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:ring-offset-2 focus-visible:outline-none touch-press"
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
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-[#E3E1DC] bg-white px-3 py-2 text-xs font-medium text-[#393834] hover:bg-[#FAF9F6] active:bg-[#F0EEEA] focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none touch-press"
                  >
                    Revert to Original
                  </button>

                  <button
                    type="button"
                    onClick={onBackToCrop}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-[#E3E1DC] bg-white px-3 py-2 text-xs font-medium text-[#777570] hover:text-[#393834] hover:bg-[#FAF9F6] active:bg-[#F0EEEA] focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none touch-press"
                  >
                    Adjust Crop
                  </button>
                </div>
              </div>
            ) : (
              // Actions when cutout has not been generated
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleStartRemovalClick}
                  disabled={isProcessing}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#55534F] hover:bg-[#45433F] active:bg-[#383633] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:ring-offset-2 focus-visible:outline-none touch-press disabled:opacity-50"
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
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-[#E3E1DC] bg-white px-4 py-2.5 text-xs sm:text-sm font-medium text-[#393834] hover:bg-[#FAF9F6] active:bg-[#F0EEEA] focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none touch-press"
                >
                  <span>Keep Original Background</span>
                </button>

                <div className="grid grid-cols-2 gap-2 mt-0.5">
                  <button
                    type="button"
                    onClick={onBackToCrop}
                    disabled={isProcessing}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-[#E3E1DC] bg-white px-3 py-2 text-xs font-medium text-[#777570] hover:text-[#393834] hover:bg-[#FAF9F6] active:bg-[#F0EEEA] focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none touch-press"
                  >
                    Adjust Crop
                  </button>

                  <button
                    type="button"
                    onClick={onReplacePhoto}
                    disabled={isProcessing}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-[#E3E1DC] bg-white px-3 py-2 text-xs font-medium text-[#777570] hover:text-[#393834] hover:bg-[#FAF9F6] active:bg-[#F0EEEA] focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none touch-press"
                  >
                    Change Photo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Explicit external processing consent modal */}
      {isConsentModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="external-processing-consent-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs"
        >
          <div className="w-full max-w-md rounded-xl border border-[#E3E1DC] bg-white p-5 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FAF9F6] border border-[#E3E1DC] text-[#55534F]">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 id="external-processing-consent-title" className="text-base font-semibold text-[#393834]">
                  Allow remove.bg Processing?
                </h3>
                <p className="mt-1 text-xs text-[#777570] leading-relaxed">
                  When you choose Remove Background, your cropped portrait will be sent over HTTPS to remove.bg through the selected service.
                </p>
              </div>
            </div>

            <div className="mt-3.5 rounded-lg border border-[#E3E1DC] bg-[#FAF9F6] p-3 text-xs text-[#55534F] space-y-2 leading-relaxed">
              <p>• <strong>External provider:</strong> remove.bg processes the photo and returns a transparent PNG. Its data handling is governed by its own policies.</p>
              <p>• <strong>Your choice:</strong> Continue only if you agree to send this photo to an external service. Choose Keep Original Background to avoid sending it.</p>
              <p>• <strong>Control:</strong> This choice is saved in this browser and can be revoked from this screen.</p>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsConsentModalOpen(false)}
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[#E3E1DC] bg-white px-4 py-2 text-xs font-medium text-[#777570] hover:text-[#393834] hover:bg-[#FAF9F6] focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none touch-press"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmConsent}
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[#55534F] hover:bg-[#45433F] active:bg-[#383633] px-4 py-2 text-xs font-semibold text-white shadow-2xs focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none touch-press"
              >
                Agree &amp; Remove Background
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
