import React from 'react';

export const WorkflowExplainer: React.FC = () => {
  return (
    <div className="w-full rounded-xl border border-[#E3E1DC] bg-white p-5 sm:p-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#777570] mb-4">
        Tips for best print results
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-[#E3E1DC]">
        <div className="pt-3 sm:pt-0">
          <h4 className="text-sm font-semibold text-[#393834]">Clear Headshot</h4>
          <p className="mt-1 text-xs text-[#777570] leading-relaxed">
            Look directly at the camera with head centered, shoulders level, and a neutral expression.
          </p>
        </div>

        <div className="pt-4 sm:pt-0 sm:pl-6">
          <h4 className="text-sm font-semibold text-[#393834]">Even Lighting</h4>
          <p className="mt-1 text-xs text-[#777570] leading-relaxed">
            Ensure balanced illumination across the face without harsh shadows, backlighting, or glare.
          </p>
        </div>

        <div className="pt-4 sm:pt-0 sm:pl-6">
          <h4 className="text-sm font-semibold text-[#393834]">Plain Background</h4>
          <p className="mt-1 text-xs text-[#777570] leading-relaxed">
            A light, solid wall works best, or cleanly isolate the subject with AI background removal in Step 3.
          </p>
        </div>
      </div>
    </div>
  );
};
