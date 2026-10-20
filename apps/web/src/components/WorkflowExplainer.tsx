import React from 'react';

export const WorkflowExplainer: React.FC = () => {
  return (
    <div>
      {/* Mobile Collapsible View (< sm) */}
      <details className="sm:hidden rounded-xl border border-slate-200 bg-white p-3 shadow-xs group">
        <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold text-slate-800 select-none">
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Photo Tips for Best Print Results</span>
          </span>
          <span className="text-slate-400 text-[10px] group-open:rotate-180 transition-transform">
            ▼
          </span>
        </summary>
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-col gap-1.5 text-xs text-slate-600">
          <p><strong className="text-slate-800">Clear Headshot:</strong> Look straight at camera with centered framing.</p>
          <p><strong className="text-slate-800">Even Lighting:</strong> Avoid deep shadows across the face or glare.</p>
          <p><strong className="text-slate-800">Background:</strong> Plain background preferred, or replace in Step 3.</p>
        </div>
      </details>

      {/* Desktop 3-Column View (>= sm) */}
      <div className="hidden sm:block rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Photo Tips for Best Results
        </h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs text-slate-600">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="font-semibold text-slate-800">Clear Headshot</p>
            <p className="mt-0.5 text-slate-600">
              Look directly at the camera with shoulders level and head centered.
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-3">
            <p className="font-semibold text-slate-800">Even Lighting</p>
            <p className="mt-0.5 text-slate-600">
              Avoid strong facial shadows or overexposed bright spots.
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-3">
            <p className="font-semibold text-slate-800">Plain Background</p>
            <p className="mt-0.5 text-slate-600">
              Plain wall preferred, or replace it with a solid color in Step 3.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
