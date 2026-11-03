import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../utils.js';

export interface StopwatchProps {
  seconds: number;
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'tv';
  showIcon?: boolean;
  className?: string;
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export const Stopwatch: React.FC<StopwatchProps> = ({
  seconds,
  isActive = false,
  size = 'md',
  showIcon = true,
  className,
}) => {
  const sizeClasses = {
    sm: 'text-sm font-semibold gap-1.5',
    md: 'text-2xl font-bold gap-2',
    lg: 'text-4xl md:text-5xl font-bold tracking-tight gap-3',
    tv: 'text-5xl md:text-6xl font-extrabold tracking-tight gap-4',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    tv: 'w-10 h-10',
  }[size];

  return (
    <div
      className={cn(
        'font-display inline-flex items-center tabular-nums select-none',
        isActive ? 'text-volt' : 'text-muted',
        sizeClasses,
        className
      )}
    >
      {showIcon && (
        <Clock
          className={cn(
            iconSizes,
            isActive && 'animate-pulse text-volt'
          )}
        />
      )}
      <span>{formatDuration(seconds)}</span>
    </div>
  );
};

Stopwatch.displayName = 'Stopwatch';
