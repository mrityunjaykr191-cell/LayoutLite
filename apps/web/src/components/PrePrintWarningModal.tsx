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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 no-print"
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
        className="relative flex flex-col max-h-[92dvh] w-full max-w-lg rounded-xl bg-white shadow-2xl border border-[#E3E1DC] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E3E1DC] px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FAF9F6] text-[#55534F]">
              <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" />
              </svg>
            </span>
            <div>
              <h3 id="warning-modal-title" className="text-sm font-semibold text-[#393834] sm:text-base">
                Printer Scale Verification
              </h3>
              <p className="text-xs text-[#777570]">
                Action required in your printer settings window
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onCancel}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#777570] hover:bg-[#FAF9F6] hover:text-[#393834] touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none"
            aria-label="Close dialog"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div id="warning-modal-desc" className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 text-xs text-[#393834]">
          <p className="leading-relaxed text-[#777570] text-xs sm:text-[13px]">
            Web applications cannot control your printer settings automatically. When your print dialog appears, verify that your printer scale is set to <strong className="text-[#393834] font-semibold">100% (Actual Size)</strong>.
          </p>

          {/* Scale Comparison: Stacked on narrow phones (< 640px), Side-by-side on sm+ (>= 640px) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Correct Setting */}
            <div className="flex flex-col gap-1.5 rounded-lg border border-[#E3E1DC] bg-[#FAF9F6] p-3 shadow-2xs">
              <div className="flex items-center gap-1.5 text-[#393834] font-semibold text-xs">
                <svg className="h-4 w-4 shrink-0 text-[#55534F]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m5 12 4 4L19 6" />
                </svg>
                <span>Correct: 100% Scale</span>
              </div>
              <p className="text-[11px] text-[#55534F] leading-normal">
                Choose <strong>&ldquo;100%&rdquo;</strong> or <strong>&ldquo;Actual Size&rdquo;</strong> in the printer dialog to preserve exact physical millimeters.
              </p>
            </div>

            {/* Incorrect Setting */}
            <div className="flex flex-col gap-1.5 rounded-lg border border-[#E3E1DC] bg-[#FAF9F6] p-3 shadow-2xs">
              <div className="flex items-center gap-1.5 text-[#393834] font-semibold text-xs">
                <svg className="h-4 w-4 shrink-0 text-[#777570]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6 6 18" />
                </svg>
                <span>Do Not Use: Fit to Page</span>
              </div>
              <p className="text-[11px] text-[#55534F] leading-normal">
                Avoid <strong>&ldquo;Fit to Page&rdquo;</strong> or <strong>&ldquo;Shrink to Printable Area&rdquo;</strong>, which shrinks photos by 5% to 8%.
              </p>
            </div>
          </div>

          {/* 50 mm Ruler Instruction Callout */}
          <div className="flex items-start gap-2.5 rounded-lg border border-[#E3E1DC] bg-[#FAF9F6] p-3 text-[#55534F] shadow-2xs">
            <svg className="h-4.5 w-4.5 text-[#777570] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs leading-relaxed text-[#777570]">
              <strong className="block font-semibold text-[#393834] mb-0.5">Physical Ruler Verification:</strong>
              A calibrated <strong>50 mm ruler</strong> can be printed in the bottom margin of the A4 page. Measure it with a real physical ruler after printing to verify physical 1:1 scale.
            </div>
          </div>
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="border-t border-[#E3E1DC] bg-[#FAF9F6] px-4 py-3 sm:px-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#E3E1DC] bg-white px-4 py-2 text-xs font-semibold text-[#393834] hover:bg-[#FAF9F6] active:bg-[#F0EEEA] touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none shadow-2xs"
          >
            Cancel
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#55534F] hover:bg-[#45433F] active:bg-[#383633] px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {actionType === 'download' ? 'Understood — Download PDF' : 'Understood — Open Print Dialog'}
          </button>
        </div>
      </div>
    </div>
  );
};
