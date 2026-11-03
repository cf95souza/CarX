import React from 'react';
import { cn } from '../utils.js';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
}

export interface BottomNavProps {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  items,
  activeId,
  onSelect,
  className,
}) => {
  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 bg-asfalto/95 backdrop-blur-md border-t border-aco/60',
        'safe-area-bottom px-2 py-1',
        className
      )}
    >
      <div className="max-w-md mx-auto flex items-center justify-around h-16">
        {items.map((item) => {
          const isActive = item.id === activeId;

          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                'relative flex-1 flex flex-col items-center justify-center py-1 transition-colors select-none',
                isActive ? 'text-volt font-bold' : 'text-muted hover:text-texto'
              )}
            >
              <div className="relative">
                <span className="w-6 h-6 flex items-center justify-center">{item.icon}</span>
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 min-w-[1.125rem] h-4.5 px-1 rounded-full bg-error text-[10px] font-extrabold text-white flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium tracking-tight mt-1">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-volt" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

BottomNav.displayName = 'BottomNav';
