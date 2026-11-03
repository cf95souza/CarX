import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../utils.js';

export interface StepItem {
  id: string | number;
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  onStepClick,
  className,
}) => {
  return (
    <div className={cn('w-full flex items-center justify-between', className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isUpcoming = index > currentStep;

        return (
          <React.Fragment key={step.id}>
            <div
              className={cn(
                'flex items-center gap-3',
                onStepClick && isCompleted && 'cursor-pointer'
              )}
              onClick={() => onStepClick && isCompleted && onStepClick(index)}
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-sm transition-colors',
                  isCompleted && 'bg-volt text-asfalto',
                  isCurrent && 'bg-asfalto text-volt border-2 border-volt shadow-sm',
                  isUpcoming && 'bg-aco/50 text-muted border border-linha'
                )}
              >
                {isCompleted ? <Check className="w-5 h-5 stroke-[2.5]" /> : index + 1}
              </div>
              <div className="hidden sm:flex flex-col">
                <span
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wider',
                    isCurrent ? 'text-volt' : isCompleted ? 'text-texto' : 'text-muted'
                  )}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="text-[11px] text-muted">{step.description}</span>
                )}
              </div>
            </div>

            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-3 rounded-full transition-colors',
                  index < currentStep ? 'bg-volt' : 'bg-linha'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

Stepper.displayName = 'Stepper';

