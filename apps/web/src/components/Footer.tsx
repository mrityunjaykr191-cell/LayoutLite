import React from 'react';
import type { BackgroundRemovalMode } from '../services/backgroundRemoval/types.ts';
import { providerRegistry } from '../services/backgroundRemovalClient.ts';

interface FooterProps {
  readonly mode?: BackgroundRemovalMode;
}

export const Footer: React.FC<FooterProps> = ({ mode }) => {
  const activeMode = mode ?? providerRegistry.getActiveMode();
  const isRemote = activeMode === 'remote';

  return (
    <footer className="mt-auto border-t border-[#E3E1DC] bg-white py-3 sm:py-3.5 text-xs text-[#777570] no-print">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-1.5 px-3 sm:flex-row sm:px-6">
        <p className="text-[#777570]">
          LayoutLite — Accurate portrait photo tiling for physical printing.
        </p>
        <p className="flex items-center gap-1.5 text-[#777570]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-600" aria-hidden="true" />
          <span>
            Background removal sends the cropped photo to remove.bg over HTTPS
            {isRemote ? ' through the cloud service' : ' through the local service'}
          </span>
        </p>
      </div>
    </footer>
  );
};
