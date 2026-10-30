import React from 'react';

export interface StepItem {
  readonly id: number;
  readonly name: string;
  readonly label: string;
}

export const WORKFLOW_STEPS: readonly StepItem[] = Object.freeze([
  { id: 1, name: 'Upload', label: '1. Upload Photo' },
  { id: 2, name: 'Crop', label: '2. Crop & Frame' },
  { id: 3, name: 'Background', label: '3. Background' },
  { id: 4, name: 'Color', label: '4. Color' },
  { id: 5, name: 'Dimensions', label: '5. Dimensions' },
  { id: 6, name: 'Sheet Layout', label: '6. Sheet Layout' },
  { id: 7, name: 'Export & Print', label: '7. Print & PDF' },
]);

interface StepperProps {
  readonly currentStep: number;
}

export const Stepper: React.FC<StepperProps> = ({ currentStep }) => {
  const currentStepObj = WORKFLOW_STEPS.find((s) => s.id === currentStep) ?? WORKFLOW_STEPS[0]!;

  return (
    <nav aria-label="Workflow progress" className="border-b border-[#E3E1DC] bg-white no-print">
      {/* Mobile Stepper View (< sm) */}
      <div className="sm:hidden px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#55534F] text-[11px] font-bold text-white tabular-nums">
            {currentStep}
          </span>
          <span className="text-xs font-semibold text-[#393834] truncate" aria-current="step">
            <span className="text-[#777570] font-normal tabular-nums">{currentStep}/{WORKFLOW_STEPS.length}</span>{' '}
            {currentStepObj.name}
          </span>
        </div>

        {/* 7-segment visual progress indicator */}
        <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
          {WORKFLOW_STEPS.map((step) => (
            <span
              key={step.id}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                step.id === currentStep
                  ? 'w-4 bg-[#55534F]'
                  : step.id < currentStep
                  ? 'w-1.5 bg-[#777570]'
                  : 'w-1.5 bg-[#E3E1DC]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Desktop Stepper View (>= sm) */}
      <div className="hidden sm:block mx-auto max-w-5xl px-4 sm:px-6 py-2 overflow-x-auto">
        <ol className="flex items-center gap-1 sm:gap-1.5 text-xs font-medium min-w-max">
          {WORKFLOW_STEPS.map((step, index) => {
            const isCurrent = step.id === currentStep;
            const isCompleted = step.id < currentStep;

            return (
              <li key={step.id} className="flex shrink-0 items-center">
                <div
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors ${
                    isCurrent
                      ? 'bg-[#55534F] font-semibold text-white'
                      : isCompleted
                      ? 'text-[#393834] font-medium'
                      : 'text-[#777570] font-normal'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold tabular-nums ${
                      isCurrent
                        ? 'bg-white text-[#55534F]'
                        : isCompleted
                        ? 'bg-[#E3E1DC] text-[#393834]'
                        : 'border border-[#E3E1DC] text-[#777570]'
                    }`}
                  >
                    {isCompleted ? '✓' : step.id}
                  </span>
                  <span>{step.name}</span>
                </div>

                {index < WORKFLOW_STEPS.length - 1 && (
                  <svg
                    className="mx-0.5 sm:mx-1 h-3 w-3 shrink-0 text-[#C8C5BE]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
};
