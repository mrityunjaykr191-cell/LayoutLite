import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white py-4 text-xs text-slate-500 no-print">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-3 sm:flex-row sm:px-6">
        <p className="text-slate-500">
          LayoutLite — Accurate portrait photo tiling for physical printing.
        </p>
        <p className="flex items-center gap-1.5 text-slate-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          <span>Local processing only</span>
        </p>
      </div>
    </footer>
  );
};
