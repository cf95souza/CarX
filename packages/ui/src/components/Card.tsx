import React from 'react';
import { cn } from '../utils.js';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'outline';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variantClasses = {
      default: 'bg-grafite border border-aco text-texto',
      interactive: 'bg-grafite border border-aco text-texto hover:border-volt/50 transition-colors cursor-pointer',
      outline: 'bg-transparent border border-linha text-texto',
    }[variant];

    return (
      <div
        ref={ref}
        className={cn('rounded-card p-6 shadow-sm overflow-hidden', variantClasses, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn('flex flex-col space-y-1.5 mb-4', className)} {...props} />;

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  ...props
}) => (
  <h3
    className={cn('font-display text-lg font-bold tracking-tight text-texto', className)}
    {...props}
  />
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  ...props
}) => <p className={cn('text-sm text-muted', className)} {...props} />;

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn('', className)} {...props} />;

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn('flex items-center pt-4 border-t border-aco/50 mt-4', className)} {...props} />;
