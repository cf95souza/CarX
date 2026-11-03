import React from 'react';
import { Camera, Check, Plus } from 'lucide-react';
import { cn } from '../utils.js';

export interface PhotoSlot {
  id: string;
  angle: 'front' | 'left' | 'right' | 'rear' | 'detail';
  label: string;
  url?: string;
  required?: boolean;
}

export interface PhotoGalleryBarProps {
  slots: PhotoSlot[];
  onSlotClick: (slot: PhotoSlot) => void;
  className?: string;
}

export const PhotoGalleryBar: React.FC<PhotoGalleryBarProps> = ({
  slots,
  onSlotClick,
  className,
}) => {
  return (
    <div className={cn('w-full flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin', className)}>
      {slots.map((slot) => {
        const hasPhoto = Boolean(slot.url);

        return (
          <div
            key={slot.id}
            onClick={() => onSlotClick(slot)}
            className={cn(
              'relative flex-shrink-0 w-24 h-28 rounded-card p-2 flex flex-col items-center justify-between cursor-pointer transition-all',
              'border select-none',
              hasPhoto
                ? 'bg-grafite border-volt/40 hover:border-volt'
                : 'bg-aco/30 border-dashed border-linha hover:border-muted'
            )}
          >
            {hasPhoto ? (
              <>
                <img
                  src={slot.url}
                  alt={slot.label}
                  className="w-full h-16 object-cover rounded-lg"
                />
                <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-volt text-asfalto flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
              </>
            ) : (
              <div className="w-full h-16 flex flex-col items-center justify-center text-muted">
                <Camera className="w-6 h-6 mb-1 text-muted/70" />
                <Plus className="w-3.5 h-3.5" />
              </div>
            )}
            <span
              className={cn(
                'text-[11px] font-semibold tracking-tight text-center truncate w-full',
                hasPhoto ? 'text-texto' : 'text-muted'
              )}
            >
              {slot.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

PhotoGalleryBar.displayName = 'PhotoGalleryBar';
