import React from 'react';
import type { BackgroundRemovalMode } from '../services/backgroundRemoval/types.ts';
import { providerRegistry } from '../services/backgroundRemovalClient.ts';

interface HeaderProps {
  readonly mode?: BackgroundRemovalMode;
}

export const Header: React.FC<HeaderProps> = ({ mode }) => {
  const activeMode = mode ?? providerRegistry.getActiveMode();
  const isRemote = activeMode === 'remote';

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

        {/* Minimal Privacy Note */}
        <div
          className="inline-flex shrink-0 items-center gap-1.5 text-xs text-[#777570]"
          title={isRemote ? 'Photo sent securely over HTTPS for temporary processing' : 'Photos are processed entirely on your device with local processing'}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isRemote ? 'bg-amber-600' : 'bg-emerald-600'}`} aria-hidden="true" />
          <span className="sm:hidden text-[11px] font-medium text-[#777570]">{isRemote ? 'Cloud AI' : 'On-device'}</span>
          <span className="hidden sm:inline text-xs text-[#777570]">
            {isRemote
              ? 'Cloud processing • Photo sent securely for temporary processing'
              : 'Local processing • On-device only'}
          </span>
        </div>
      </div>
    </header>
  );
};
