import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-200 bg-white shadow-xs">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-4">
        {/* Title area */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-2xl">
              LayoutLite
            </h1>
          </div>
          <p className="hidden sm:block mt-0.5 text-sm text-slate-600">
            Prepare, crop, and tile photos onto an A4 sheet for physical printing
          </p>
        </div>

        {/* Privacy Badge: Compact icon pill on mobile, full description on desktop */}
        <div
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full sm:rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-medium text-emerald-800"
          title="Photos stay on your device — processed locally with zero external uploads"
        >
          <svg
            className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-emerald-600"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
              clipRule="evenodd"
            />
          </svg>
          <span className="sm:hidden font-semibold">100% Private</span>
          <span className="hidden sm:inline">100% Local &amp; Private — Photos stay on your device</span>
        </div>
      </div>
    </header>
  );
};
