import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-200/80 bg-white no-print">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3.5">
        {/* Brand & Subtitle */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v4a2 2 0 002 2h4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-6 4h4" />
              </svg>
            </div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
              LayoutLite
            </h1>
          </div>
          <p className="hidden sm:block mt-0.5 text-xs text-slate-500">
            Prepare, crop, and tile portrait photos onto an A4 sheet for physical printing
          </p>
        </div>

        {/* Minimal Local Privacy Pill */}
        <div
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
          title="Photos are processed entirely on your device with zero cloud storage"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          <span className="sm:hidden text-[11px] font-semibold text-slate-700">Local</span>
          <span className="hidden sm:inline text-xs text-slate-600">Local processing • On-device only</span>
        </div>
      </div>
    </header>
  );
};
