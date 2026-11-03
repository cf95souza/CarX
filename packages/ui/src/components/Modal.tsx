import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils.js';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    full: 'max-w-5xl w-full',
  }[size];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-asfalto/85 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className={cn(
          'relative w-full rounded-modal bg-grafite border border-aco shadow-xl z-10 overflow-hidden flex flex-col max-h-[90vh]',
          sizeClasses,
          className
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between p-6 border-b border-aco/50">
            <div>
              {title && (
                <h2 className="font-display text-xl font-bold text-texto tracking-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-muted mt-1">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-muted hover:text-texto p-1.5 rounded-lg hover:bg-aco/50 transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto scrollbar-thin flex-1 text-texto">
          {children}
        </div>
      </div>
    </div>
  );
};

Modal.displayName = 'Modal';
