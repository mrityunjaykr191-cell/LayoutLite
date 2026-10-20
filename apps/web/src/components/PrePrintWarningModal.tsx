import React, { useEffect, useRef } from 'react';

interface PrePrintWarningModalProps {
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
        confirmButtonRef.current?.focus();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Handle native escape key
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onCancel();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onCancel]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-slate-900/60 backdrop:backdrop-blur-xs fixed inset-0 z-50 m-auto w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl open:flex open:flex-col"
      aria-labelledby="warning-modal-title"
      aria-describedby="warning-modal-desc"
    >
      <div className="flex flex-col gap-4">
        {/* Header with high-contrast warning icon */}
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </span>
          <div>
            <h3 id="warning-modal-title" className="text-base font-bold text-slate-900 sm:text-lg">
              Important Printer Setting
            </h3>
            <p className="text-xs text-slate-600">
              Avoid incorrect photo sizes on physical paper
            </p>
          </div>
        </div>

        {/* Setting comparison boxes */}
        <div id="warning-modal-desc" className="flex flex-col gap-2.5 rounded-lg bg-slate-50 p-4 border border-slate-200 text-xs">
          <p className="font-semibold text-slate-800">
            When your printer window opens, verify this exact setting:
          </p>

          {/* Correct setting */}
          <div className="flex items-center gap-2.5 rounded-md border border-emerald-300 bg-emerald-50/80 p-2.5 text-emerald-950 font-medium">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span>
              <strong>Set Scale to 100%</strong> (or &ldquo;Actual Size&rdquo;)
            </span>
          </div>

          {/* Incorrect setting */}
          <div className="flex items-center gap-2.5 rounded-md border border-rose-300 bg-rose-50/80 p-2.5 text-rose-950 font-medium">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
            <span>
              <strong>DO NOT</strong> select &ldquo;Fit to Page&rdquo; or &ldquo;Shrink to Printable Area&rdquo;
            </span>
          </div>

          <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">
            &ldquo;Fit to Page&rdquo; shrinks the document by 5% to 8%, resulting in smaller photos than your required physical millimeters.
          </p>
        </div>

        {/* 50 mm Calibration Ruler Reminder */}
        <div className="flex items-start gap-2 rounded-lg bg-blue-50/80 p-3 border border-blue-200 text-xs text-blue-950">
          <svg className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[11px] leading-relaxed">
            A <strong>50 mm verification ruler</strong> is included at the bottom margin of the sheet. After printing, measure it with a real physical ruler to verify 100% scale!
          </p>
        </div>

        {/* Modal Actions */}
        <div className="mt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Cancel
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            {actionType === 'download' ? 'Understood — Download PDF' : 'Understood — Open Print Dialog'}
          </button>
        </div>
      </div>
    </dialog>
  );
};
