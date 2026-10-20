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
    <nav aria-label="Workflow progress" className="border-b border-slate-200 bg-white">
      {/* Mobile Stepper View (< sm) */}
      <div className="sm:hidden px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
            {currentStep}
          </span>
          <span className="text-xs font-semibold text-slate-900" aria-current="step">
            Step {currentStep} of {WORKFLOW_STEPS.length}: {currentStepObj.name}
          </span>
        </div>

        {/* 7-dot visual progress indicator */}
        <div className="flex items-center gap-1" aria-hidden="true">
          {WORKFLOW_STEPS.map((step) => (
            <span
              key={step.id}
              className={`h-1.5 rounded-full transition-all ${
                step.id === currentStep
                  ? 'w-4 bg-blue-600'
                  : step.id < currentStep
                  ? 'w-1.5 bg-slate-400'
                  : 'w-1.5 bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Desktop Stepper View (>= sm) */}
      <div className="hidden sm:block mx-auto max-w-5xl px-6 py-2.5">
        <ol className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-medium">
          {WORKFLOW_STEPS.map((step, index) => {
            const isCurrent = step.id === currentStep;
            const isCompleted = step.id < currentStep;

            return (
              <li key={step.id} className="flex shrink-0 items-center">
                <div
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors ${
                    isCurrent
                      ? 'bg-blue-600 font-semibold text-white shadow-xs'
                      : isCompleted
                      ? 'bg-slate-100 text-slate-800'
                      : 'text-slate-400'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-white text-blue-700'
                        : isCompleted
                        ? 'bg-slate-200 text-slate-700'
                        : 'border border-slate-300 text-slate-400'
                    }`}
                  >
                    {isCompleted ? '✓' : step.id}
                  </span>
                  <span>{step.name}</span>
                </div>

                {index < WORKFLOW_STEPS.length - 1 && (
                  <svg
                    className="mx-1 h-3.5 w-3.5 shrink-0 text-slate-300"
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
