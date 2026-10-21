import React, { useEffect, useRef } from 'react';

export interface PrePrintWarningModalProps {
  readonly isOpen: boolean;
  readonly actionType: 'download' | 'print';
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export const PrePrintWarningModal: React.FC<PrePrintWarningModalProps> = ({
  isOpen,
  actionType,
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;

    // Focus primary confirm button on open
    const focusTimer = setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
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

    // Prevent background scrolling while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previousActiveElement?.focus?.();
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onCancel}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="warning-modal-title"
        aria-describedby="warning-modal-desc"
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col max-h-[92dvh] w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
              <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <div>
              <h3 id="warning-modal-title" className="text-sm font-bold text-slate-900 sm:text-base">
                Printer Scale Verification
              </h3>
              <p className="text-[11px] text-slate-500">
                Action required in your printer settings window
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onCancel}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 touch-press focus-visible:ring-2 focus-visible:ring-blue-600"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div id="warning-modal-desc" className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 text-xs text-slate-700">
          <p className="leading-relaxed text-slate-600 text-xs sm:text-[13px]">
            Web applications cannot control your printer settings automatically. When your print dialog appears, verify that your printer scale is set to <strong className="text-slate-900 font-semibold">100% (Actual Size)</strong>.
          </p>

          {/* Scale Comparison: Stacked on narrow phones (< 640px), Side-by-side on sm+ (>= 640px) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Correct Setting */}
            <div className="flex flex-col gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 shadow-2xs">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px]">
                  ✓
                </span>
                <span>Correct: 100% Scale</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-normal">
                Choose <strong>&ldquo;100%&rdquo;</strong> or <strong>&ldquo;Actual Size&rdquo;</strong> in the printer dialog to preserve exact physical millimeters.
              </p>
            </div>

            {/* Incorrect Setting */}
            <div className="flex flex-col gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 p-3 shadow-2xs">
              <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs">
                <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white text-[10px]">
                  ✕
                </span>
                <span>Do Not Use: Fit to Page</span>
              </div>
              <p className="text-[11px] text-rose-800 leading-normal">
                Avoid <strong>&ldquo;Fit to Page&rdquo;</strong> or <strong>&ldquo;Shrink to Printable Area&rdquo;</strong>, which shrinks photos by 5% to 8%.
              </p>
            </div>
          </div>

          {/* 50 mm Ruler Instruction Callout */}
          <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-blue-950 shadow-2xs">
            <svg className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-[11px] leading-relaxed">
              <strong className="block font-semibold text-blue-900 mb-0.5">Physical Ruler Verification:</strong>
              A calibrated <strong>50 mm ruler</strong> is printed in the bottom margin of the A4 page. Measure it with a real physical ruler after printing to verify physical 1:1 scale.
            </div>
          </div>
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 touch-press focus-visible:ring-2 focus-visible:ring-blue-600 shadow-2xs"
          >
            Cancel
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 touch-press focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            {actionType === 'download' ? 'Understood — Download PDF' : 'Understood — Open Print Dialog'}
          </button>
        </div>
      </div>
    </div>
  );
};
