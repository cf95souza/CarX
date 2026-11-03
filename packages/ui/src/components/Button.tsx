import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils.js';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'volt' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'mobile' | 'desktop' | 'sm';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'volt',
      size = 'desktop',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      mobile: 'min-h-[3.5rem] h-14 px-6 text-base font-semibold', // 56px para luvas/oficina
      desktop: 'min-h-[3rem] h-12 px-5 text-sm font-semibold',     // 48px para gestão
      sm: 'min-h-[2.25rem] h-9 px-3 text-xs font-medium',          // 36px para ações compactas
    }[size];

    const variantClasses = {
      // Texto sobre Volt é rigorosamente Asfalto #0E1116 para contraste > 4.5:1
      volt: 'bg-volt text-asfalto hover:bg-volt-hover active:bg-volt-active shadow-sm font-bold',
      secondary: 'bg-grafite text-texto hover:bg-aco border border-aco',
      outline: 'bg-transparent text-texto border border-aco hover:bg-grafite/50',
      ghost: 'bg-transparent text-muted hover:text-texto hover:bg-grafite/40',
      danger: 'bg-error text-white hover:bg-error/90',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-btn transition-colors duration-150 select-none cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt focus-visible:ring-offset-2 focus-visible:ring-offset-asfalto',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses,
          sizeClasses,
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

