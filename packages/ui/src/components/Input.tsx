import React from 'react';
import { cn } from '../utils.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-muted">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3.5 text-muted pointer-events-none flex items-center">
              {leftIcon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full h-12 px-4 rounded-input bg-aco/60 border border-linha text-texto placeholder:text-muted/60 text-sm font-body',
              'focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              leftIcon && 'pl-11',
              rightIcon && 'pr-11',
              error && 'border-error focus:border-error focus:ring-error',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3.5 text-muted flex items-center">
              {rightIcon}
            </span>
          )}
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

Input.displayName = 'Input';
