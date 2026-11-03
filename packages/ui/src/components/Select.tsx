import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils.js';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold uppercase tracking-wider text-muted">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'w-full h-12 pl-4 pr-10 rounded-input bg-aco/60 border border-linha text-texto text-sm font-body appearance-none cursor-pointer',
              'focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-error focus:border-error focus:ring-error',
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-grafite text-texto">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3.5 w-4 h-4 text-muted pointer-events-none" />
        </div>
        {error ? (
          <span className="text-xs text-error font-medium">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-muted">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';

