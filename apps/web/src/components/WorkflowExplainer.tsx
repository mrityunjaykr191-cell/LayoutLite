import React from 'react';

export const WorkflowExplainer: React.FC = () => {
  return (
    <div className="w-full">
      {/* Mobile Collapsible View (< sm) */}
      <details className="sm:hidden rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs group">
        <summary className="flex min-h-[44px] cursor-pointer items-center justify-between text-xs font-semibold text-slate-800 select-none">
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Photo Tips for Best Print Results</span>
          </span>
          <span className="text-slate-400 text-xs group-open:rotate-180 transition-transform duration-200">
            ▼
          </span>
        </summary>
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-col gap-2 text-xs text-slate-600">
          <p><strong className="text-slate-800">Clear Headshot:</strong> Look straight at the camera with shoulders level and head centered.</p>
          <p><strong className="text-slate-800">Even Lighting:</strong> Avoid heavy facial shadows, glare, or backlighting.</p>
          <p><strong className="text-slate-800">Plain Background:</strong> A light, plain wall works best; you can also remove it in Step 3.</p>
        </div>
      </details>

      {/* Desktop 3-Column View (>= sm) */}
      <div className="hidden sm:block rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Photo Tips for Best Results
        </h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs text-slate-600">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <p className="font-semibold text-slate-800">Clear Headshot</p>
            <p className="mt-1 text-slate-600 leading-relaxed">
              Look directly at the camera with head centered and shoulders level.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <p className="font-semibold text-slate-800">Even Lighting</p>
            <p className="mt-1 text-slate-600 leading-relaxed">
              Ensure balanced lighting across the face; avoid strong cast shadows.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <p className="font-semibold text-slate-800">Plain Background</p>
            <p className="mt-1 text-slate-600 leading-relaxed">
              Light background preferred, or cleanly isolate with AI in Step 3.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
