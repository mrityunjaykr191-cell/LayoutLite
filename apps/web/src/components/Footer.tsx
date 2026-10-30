import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-[#E3E1DC] bg-white py-3 sm:py-3.5 text-xs text-[#777570] no-print">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-1.5 px-3 sm:flex-row sm:px-6">
        <p className="text-[#777570]">
          LayoutLite — Accurate portrait photo tiling for physical printing.
        </p>
        <p className="flex items-center gap-1.5 text-[#777570]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
          <span>Local processing only</span>
        </p>
      </div>
    </footer>
  );
};
