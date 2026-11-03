import React from 'react';
import { cn } from '../utils.js';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'volt' | 'alert' | 'info' | 'error' | 'neutral';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  dot = false,
  className,
  ...props
}) => {
  const variantClasses = {
    volt: 'bg-volt/15 text-volt border-volt/30',
    alert: 'bg-alert/15 text-alert border-alert/30',
    info: 'bg-info/15 text-info border-info/30',
    error: 'bg-error/15 text-error border-error/30',
    neutral: 'bg-aco/50 text-muted border-linha',
  }[variant];

  const dotClasses = {
    volt: 'bg-volt',
    alert: 'bg-alert',
    info: 'bg-info',
    error: 'bg-error',
    neutral: 'bg-muted',
  }[variant];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border',
        variantClasses,
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-2 h-2 rounded-full', dotClasses)} />}
      <span>{children}</span>
    </span>
  );
};

Badge.displayName = 'Badge';
