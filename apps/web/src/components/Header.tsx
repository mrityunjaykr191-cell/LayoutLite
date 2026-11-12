import React from 'react';
export const Header: React.FC = () => {
  return (
    <header className="border-b border-[#E3E1DC] bg-white no-print">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3.5">
        {/* Brand & Subtitle */}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#55534F] text-white">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v4a2 2 0 002 2h4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-6 4h4" />
              </svg>
            </div>
            <h1 className="text-base font-bold tracking-tight text-[#393834] sm:text-lg">
              LayoutLite
            </h1>
          </div>
          <p className="hidden sm:block mt-0.5 text-xs text-[#777570]">
            Prepare, crop, and tile portrait photos onto an A4 sheet for physical printing
          </p>
        </div>
      </div>
    </header>
  );
};
