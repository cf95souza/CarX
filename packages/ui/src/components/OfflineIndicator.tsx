import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '../utils.js';

export interface OfflineIndicatorProps {
  className?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5',
        'rounded-full bg-alert text-asfalto shadow-lg font-medium text-xs md:text-sm animate-bounce',
        className
      )}
    >
      <WifiOff className="w-4 h-4 stroke-[2.5]" />
      <span>Modo Offline: Dados salvos localmente</span>
      <RefreshCw className="w-3.5 h-3.5 animate-spin ml-1 text-asfalto/70" />
    </div>
  );
};

OfflineIndicator.displayName = 'OfflineIndicator';

