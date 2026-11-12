import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-[#E3E1DC] bg-white py-3 sm:py-3.5 text-xs text-[#777570] no-print">
      <div className="mx-auto flex max-w-5xl justify-center px-3 text-center sm:px-6">
        <p className="text-[#777570]">
          LayoutLite — Accurate portrait photo tiling for physical printing.
        </p>
      </div>
    </footer>
  );
};
