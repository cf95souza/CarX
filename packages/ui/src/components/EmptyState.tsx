import React from 'react';
import { cn } from '../utils.js';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full flex flex-col items-center justify-center text-center p-8 md:p-12',
        'rounded-card border border-dashed border-linha bg-aco/15',
        className
      )}
    >
      {icon && (
        <div className="w-14 h-14 rounded-full bg-aco/40 flex items-center justify-center text-muted mb-4">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg font-bold text-texto tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-sm text-muted max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';

